import type {
  Alternative,
  Preferences,
  RankedTrain,
  SearchQuery,
  Train,
  TravelClass,
} from '@/types';
import { TRAINS } from '@/data/trains';
import { NEARBY_STATIONS, getStation } from '@/data/stations';
import { availabilityFor, canBoard } from './availability';

const CLASS_COMFORT: Record<TravelClass, number> = {
  '2S': 0.2,
  SL: 0.4,
  CC: 0.65,
  '3A': 0.7,
  '2A': 0.85,
  EC: 0.9,
  '1A': 1,
};

export function minutesOf(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function windowOf(time: string): 'morning' | 'afternoon' | 'evening' | 'night' {
  const m = minutesOf(time);
  if (m < 300) return 'night';
  if (m < 720) return 'morning';
  if (m < 1020) return 'afternoon';
  if (m < 1290) return 'evening';
  return 'night';
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function addDays(dateISO: string, days: number): string {
  const d = new Date(`${dateISO}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Does the train serve from → to in that order? Covers intermediate halts. */
export function servesRoute(train: Train, from: string, to: string): boolean {
  const i = train.stops.findIndex((s) => s.station === from);
  const j = train.stops.findIndex((s) => s.station === to);
  return i !== -1 && j !== -1 && i < j;
}

function segmentTimes(train: Train, from: string, to: string) {
  const a = train.stops.find((s) => s.station === from)!;
  const b = train.stops.find((s) => s.station === to)!;
  const dep = a.departure ?? a.arrival!;
  const arr = b.arrival ?? b.departure!;
  const depAbs = a.day * 1440 + minutesOf(dep);
  const arrAbs = b.day * 1440 + minutesOf(arr);
  return {
    departure: dep,
    arrival: arr,
    duration: Math.max(30, arrAbs - depAbs),
    distance: Math.max(1, b.distance_km - a.distance_km),
    fraction: Math.max(0.15, (b.distance_km - a.distance_km) / (train.distance_km || 1)),
  };
}

function runsOnDate(train: Train, dateISO: string): boolean {
  const day = new Date(`${dateISO}T00:00:00`).getDay();
  return train.runs_on.includes(day);
}

/** Stage 1 — candidate generation. Route + date matches only. */
export function candidates(query: SearchQuery): Train[] {
  return TRAINS.filter(
    (t) => servesRoute(t, query.from, query.to) && runsOnDate(t, query.date),
  );
}

/**
 * Stage 2+3 — hard constraints, then Journey Utility ranking.
 * Every result carries its own "Why?" (§7, §10).
 */
export function rankTrains(
  query: SearchQuery,
  preferences?: Preferences,
): RankedTrain[] {
  const pool = candidates(query);
  const rows: RankedTrain[] = [];

  for (const train of pool) {
    const seg = segmentTimes(train, query.from, query.to);
    const classesToConsider: TravelClass[] = query.travel_class
      ? train.classes.some((c) => c.name === query.travel_class)
        ? [query.travel_class]
        : []
      : train.classes.map((c) => c.name);

    for (const cls of classesToConsider) {
      const full = availabilityFor(train, cls, query.date);
      // Fare is pro-rated for part-route travel.
      const price = Math.max(60, Math.round((full.price * seg.fraction) / 5) * 5);

      if (query.budget && price > query.budget) continue;

      const reasons: string[] = [];
      let score = 0;

      // -- time fit --
      const win = windowOf(seg.departure);
      const wanted = query.time_window ?? preferences?.preferred_departure ?? 'any';
      if (wanted !== 'any') {
        if (win === wanted) {
          score += 22;
          reasons.push(`Leaves in the ${wanted} — the window you asked for`);
        } else {
          score -= 14;
        }
      } else if (preferences?.preferred_departure && preferences.personalization_enabled) {
        if (win === preferences.preferred_departure) {
          score += 12;
          reasons.push(`Matches your usual ${preferences.preferred_departure} departure`);
        }
      }

      // -- availability / reliability --
      if (full.state === 'available') {
        // Confirmed is worth a lot, but "1 seat left" should not outrank "42 free".
        score += 18 + Math.min(12, full.available_seats / 6);
        reasons.push(
          full.available_seats > 40
            ? 'Confirmed seat available now'
            : `Confirmed, ${full.available_seats} left`,
        );
      } else if (full.state === 'rac') {
        score += 10;
        reasons.push('RAC — you can board, berth usually confirms before departure');
      } else {
        score -= 18 * (1 - (full.confirmation_probability ?? 0));
        reasons.push(
          `Waitlisted, ${
            (full.confirmation_probability ?? 0) > 0.5 ? 'good' : 'limited'
          } chance of confirming`,
        );
      }

      // -- price fit --
      const budget = query.budget ?? (preferences?.personalization_enabled ? preferences.max_budget : undefined);
      if (budget) {
        const headroom = (budget - price) / budget;
        score += Math.max(-10, Math.min(18, headroom * 26));
        if (headroom > 0.25) reasons.push(`₹${budget - price} under your budget`);
      }

      // -- duration --
      score += Math.max(-12, 16 - (seg.duration / 60) * 1.4);

      // -- comfort --
      const comfort = CLASS_COMFORT[cls];
      const wantsComfort =
        query.priority === 'comfort' ||
        (preferences?.personalization_enabled && preferences.comfort_over_price === 'always');
      score += comfort * (wantsComfort ? 24 : 8);
      if (wantsComfort && comfort >= 0.7) {
        reasons.push(cls === 'SL' ? 'Reserved sleeper berth' : `${cls} — air-conditioned, quieter coach`);
      }

      // -- explicit priority --
      if (query.priority === 'cheapest') score += Math.max(0, 24 - price / 60);
      if (query.priority === 'fastest') score += Math.max(0, 26 - (seg.duration / 60) * 2.2);

      // -- history / preferred class --
      if (preferences?.personalization_enabled && preferences.preferred_class === cls) {
        score += 9;
        reasons.push(`${cls} is the class you usually pick`);
      }

      // -- operational quality --
      score += train.punctuality * 12;
      score += (train.rating - 3.5) * 5;
      if (train.punctuality >= 0.9) reasons.push('Runs on time more than 9 trips in 10');
      if (train.is_overnight && seg.duration > 420) reasons.push('Overnight — you sleep through the journey');
      if (train.has_pantry && seg.duration > 300) reasons.push('Pantry car on board');

      rows.push({
        train,
        travel_class: cls,
        price,
        availability: { ...full, price },
        score,
        // Keep the three strongest reasons; a wall of bullets explains nothing.
        reasons: reasons.slice(0, 3),
      });
    }
  }

  rows.sort((a, b) => b.score - a.score);
  return rows;
}

/**
 * Stage 4 — the UI buckets. Best / Cheapest / Fastest / Most comfortable.
 *
 * When the user explicitly asked for a time window, the buckets honour it: a
 * card labelled "Most comfortable" showing an evening train to someone who
 * asked for the morning is not help, it is noise. The full list is unfiltered.
 */
export function bucketResults(rows: RankedTrain[], query?: SearchQuery): RankedTrain[] {
  if (rows.length === 0) return [];
  const boardable = rows.filter((r) => canBoard(r.availability));
  let pool = boardable.length > 0 ? boardable : rows;

  const wanted = query?.time_window;
  if (wanted && wanted !== 'any') {
    const inWindow = pool.filter((r) => {
      const stop = query ? r.train.stops.find((s) => s.station === query.from) : undefined;
      const dep = stop?.departure ?? stop?.arrival ?? r.train.departure_time;
      return windowOf(dep) === wanted;
    });
    if (inWindow.length > 0) pool = inWindow;
  }

  const best = pool[0];
  const cheapest = [...pool].sort((a, b) => a.price - b.price)[0];
  const fastest = [...pool].sort(
    (a, b) => a.train.duration_minutes - b.train.duration_minutes,
  )[0];
  const comfort = [...pool].sort(
    (a, b) => CLASS_COMFORT[b.travel_class] - CLASS_COMFORT[a.travel_class],
  )[0];

  const picks: RankedTrain[] = [];
  const seen = new Set<string>();
  const push = (row: RankedTrain | undefined, bucket: RankedTrain['bucket']) => {
    if (!row) return;
    const key = `${row.train.id}-${row.travel_class}`;
    if (seen.has(key)) return;
    seen.add(key);
    picks.push({ ...row, bucket });
  };

  push(best, 'best');
  push(cheapest, 'cheapest');
  push(fastest, 'fastest');
  push(comfort, 'comfort');
  return picks;
}

/**
 * No dead ends. If nothing works, say what *would* (§7).
 * Every alternative carries the reason it is being offered.
 */
export function smartAlternatives(query: SearchQuery): Alternative[] {
  const out: Alternative[] = [];

  for (const delta of [1, -1, 2]) {
    const date = addDays(query.date, delta);
    if (new Date(`${date}T00:00:00`) < new Date(new Date().toDateString())) continue;
    const rows = rankTrains({ ...query, date }).filter((r) => canBoard(r.availability));
    if (rows.length > 0) {
      out.push({
        kind: 'other_day',
        label: delta > 0 ? `${delta} day later` : `${Math.abs(delta)} day earlier`,
        reason: `${rows.length} confirmed option${rows.length > 1 ? 's' : ''} on ${date}, from ₹${Math.min(
          ...rows.map((r) => r.price),
        )}`,
        query: { date },
      });
    }
  }

  if (query.travel_class) {
    const rows = rankTrains({ ...query, travel_class: undefined }).filter(
      (r) => canBoard(r.availability) && r.travel_class !== query.travel_class,
    );
    if (rows.length > 0) {
      const alt = rows[0];
      out.push({
        kind: 'other_class',
        label: `${alt.travel_class} instead of ${query.travel_class}`,
        reason: `Confirmed at ₹${alt.price} on ${alt.train.name.en}`,
        query: { travel_class: alt.travel_class },
      });
    }
  }

  for (const [code, field] of [
    [query.from, 'from'],
    [query.to, 'to'],
  ] as const) {
    for (const near of NEARBY_STATIONS[code] ?? []) {
      const q = { ...query, [field]: near } as SearchQuery;
      const rows = rankTrains(q).filter((r) => canBoard(r.availability));
      if (rows.length > 0) {
        out.push({
          kind: 'nearby_station',
          label: `${field === 'from' ? 'Leave from' : 'Arrive at'} ${
            getStation(near)?.name.en ?? near
          }`,
          reason: `Same city, ${rows.length} confirmed option${rows.length > 1 ? 's' : ''} from ₹${Math.min(
            ...rows.map((r) => r.price),
          )}`,
          query: { [field]: near },
        });
        break;
      }
    }
  }

  if (query.quota === 'General') {
    out.push({
      kind: 'other_quota',
      label: 'Tatkal quota',
      reason: 'Opens one day before departure. Costs more, but a separate pool of seats.',
      query: { quota: 'Tatkal' },
    });
  }

  return out.slice(0, 4);
}

/** Explore: "₹3000 and two days from Chennai — where can I go?" (§7) */
export function exploreFrom(
  origin: string,
  budget: number,
  dateISO: string,
): { to: string; cheapest: number; duration: number; options: number; overnight: boolean }[] {
  const byDestination = new Map<
    string,
    { cheapest: number; duration: number; options: number; overnight: boolean }
  >();

  for (const train of TRAINS) {
    const originIdx = train.stops.findIndex((s) => s.station === origin);
    if (originIdx === -1) continue;
    for (let j = originIdx + 1; j < train.stops.length; j++) {
      const to = train.stops[j].station;
      const rows = rankTrains({
        from: origin,
        to,
        date: dateISO,
        quota: 'General',
        passengers: 1,
      }).filter((r) => canBoard(r.availability) && r.price <= budget);
      if (rows.length === 0) continue;
      const cheapest = Math.min(...rows.map((r) => r.price));
      const fastest = Math.min(...rows.map((r) => r.train.duration_minutes));
      const prev = byDestination.get(to);
      byDestination.set(to, {
        cheapest: prev ? Math.min(prev.cheapest, cheapest) : cheapest,
        duration: prev ? Math.min(prev.duration, fastest) : fastest,
        options: (prev?.options ?? 0) + rows.length,
        overnight: rows.some((r) => r.train.is_overnight),
      });
    }
  }

  return [...byDestination.entries()]
    .map(([to, v]) => ({ to, ...v }))
    .sort((a, b) => a.cheapest - b.cheapest);
}
