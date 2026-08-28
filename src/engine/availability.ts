import type { AvailabilityState, Train, TrainClassOption, TravelClass } from '@/types';

/** Deterministic hash so availability is stable per (train, class, date) but
 *  still varies across dates — which is what makes "try +1 day" meaningful. */
function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

function daysUntil(dateISO: string): number {
  const target = new Date(`${dateISO}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

/**
 * Resolve live-ish availability for a train/class/date.
 * The LLM never produces this — it comes only from the data layer (§7).
 */
export function availabilityFor(
  train: Train,
  travelClass: TravelClass,
  dateISO: string,
): TrainClassOption {
  const base = train.classes.find((c) => c.name === travelClass);
  if (!base) {
    return {
      name: travelClass,
      price: 0,
      total_seats: 0,
      available_seats: 0,
      state: 'unavailable',
    };
  }

  const r = hash(`${train.number}|${travelClass}|${dateISO}`);
  const lead = daysUntil(dateISO);

  // Closer dates are fuller. Beyond ~30 days almost everything is open.
  const pressure =
    lead <= 0 ? 0.95 : lead <= 2 ? 0.86 : lead <= 7 ? 0.68 : lead <= 15 ? 0.45 : lead <= 30 ? 0.25 : 0.1;

  // Premium classes have fewer seats, so they saturate faster.
  const scarcity = travelClass === '1A' || travelClass === 'EC' ? 0.12 : 0;
  const occupancy = Math.min(1.15, pressure + scarcity + (r - 0.5) * 0.42);

  const total = base.total_seats;
  const availableRaw = Math.round(total * (1 - occupancy));

  let state: AvailabilityState;
  let available_seats: number;
  let waitlist_position: number | undefined;
  let confirmation_probability: number | undefined;

  if (availableRaw > 0) {
    state = 'available';
    available_seats = availableRaw;
    confirmation_probability = 1;
  } else if (availableRaw > -Math.round(total * 0.06)) {
    // A thin band above the waitlist is RAC — a real, shared, boardable seat.
    state = 'rac';
    available_seats = 0;
    waitlist_position = Math.max(1, -availableRaw);
    confirmation_probability = 0.82;
  } else {
    state = 'waitlist';
    available_seats = 0;
    waitlist_position = Math.max(1, -availableRaw - Math.round(total * 0.06));
    // Longer lead time means more chance the list clears.
    const clearing = Math.max(0, Math.min(1, lead / 22));
    const depth = Math.max(0, 1 - waitlist_position / (total * 0.35));
    confirmation_probability = Math.max(0.05, Math.min(0.9, clearing * 0.55 + depth * 0.45));
  }

  return {
    ...base,
    state,
    available_seats,
    waitlist_position,
    confirmation_probability,
  };
}

/** Plain language, never a code. "WL 23" alone tells the user nothing (§8). */
export function availabilityLabel(a: TrainClassOption): {
  tone: 'confirmed' | 'attention' | 'critical';
  headline: string;
  detail: string;
} {
  switch (a.state) {
    case 'available':
      if (a.available_seats > 40) {
        return {
          tone: 'confirmed',
          headline: `${a.available_seats} seats`,
          detail: 'Plenty of room — you get a confirmed seat straight away.',
        };
      }
      return {
        tone: a.available_seats > 12 ? 'confirmed' : 'attention',
        headline: `${a.available_seats} left`,
        detail:
          a.available_seats > 12
            ? 'Confirmed seat, but filling up.'
            : 'Only a few confirmed seats left on this date.',
      };
    case 'rac':
      return {
        tone: 'attention',
        headline: 'RAC — shared berth',
        detail: 'You can board. You share a berth for now and usually get a full one before departure.',
      };
    case 'waitlist': {
      const p = a.confirmation_probability ?? 0;
      const chance = p > 0.6 ? 'High' : p > 0.3 ? 'Medium' : 'Low';
      return {
        tone: p > 0.3 ? 'attention' : 'critical',
        headline: `Waitlist ${a.waitlist_position}`,
        detail: `Chance of confirming: ${chance}. If it does not confirm, you are refunded automatically.`,
      };
    }
    default:
      return {
        tone: 'critical',
        headline: 'Not offered',
        detail: 'This train does not carry that class.',
      };
  }
}

export function canBoard(a: TrainClassOption): boolean {
  return a.state === 'available' || a.state === 'rac';
}
