import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Armchair,
  Ban,
  BedDouble,
  Calculator,
  ChevronRight,
  LayoutGrid,
  LifeBuoy,
  MapPin,
  Percent,
  Radio,
  Route,
  Search,
  Timer,
  UtensilsCrossed,
  Wallet,
} from 'lucide-react';
import { getStation, STATIONS } from '@/data/stations';
import { TRAINS, getTrain } from '@/data/trains';
import { useLiveTrain } from '@/hooks/useLiveTrain';
import { useLocalized } from '@/hooks/useLocalized';
import { formatDuration } from '@/engine/search';
import { rupees, todayISO } from '@/lib/format';
import { availabilityFor } from '@/engine/availability';
import {
  Alert,
  Badge,
  EmptyState,
  IconTile,
  Input,
  PageHeader,
  Select,
  cx,
} from '@/components/ui';

const ALL_TOOLS = [
  { to: '/pnr', title: 'PNR Enquiry', body: 'Check any booking reference', icon: Search },
  { to: '/live-status', title: 'Live Status', body: 'Where a train is right now', icon: Radio },
  { to: '/schedule', title: 'Train Schedule', body: 'Timings, routes and halts', icon: Timer },
  { to: '/platform-locator', title: 'Platform Locator', body: 'Which platform, which end', icon: MapPin },
  { to: '/coach-position', title: 'Coach Position', body: 'Where your coach stops', icon: Route },
  { to: '/food', title: 'Order Food', body: 'Meals delivered to your seat', icon: UtensilsCrossed },
  { to: '/retiring-rooms', title: 'Retiring Rooms', body: 'Rooms inside the station', icon: BedDouble },
  { to: '/lounge', title: 'Lounge Access', body: 'Somewhere quiet to wait', icon: Armchair },
  { to: '/trips', title: 'Cancel Ticket', body: 'Cancel and see the refund first', icon: Ban },
  { to: '/tdr', title: 'Refund Calculator', body: 'Estimate and file a TDR', icon: Calculator },
  { to: '/rail-madad', title: 'Rail Madad', body: 'Report a problem', icon: LifeBuoy },
  { to: '/wallet', title: 'IRCTC eWallet', body: 'Balance and history', icon: Wallet },
  { to: '/offers', title: 'Offers', body: 'Codes that work at checkout', icon: Percent },
];

/** The overflow behind "More" in Quick Actions, and the Assistant's tool list. */
export function Tools() {
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="All tools" subtitle="Everything the app can do, in one list." />
      <ul className="stagger grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ALL_TOOLS.map((t) => (
          <li key={t.title}>
            <Link to={t.to} className="lift card flex items-center gap-3 p-4">
              <IconTile icon={<t.icon className="h-4 w-4" />} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[0.875rem] font-bold text-ink">{t.title}</span>
                <span className="mt-0.5 block truncate text-[0.75rem] text-ink-muted">{t.body}</span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-ink-faint" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
      <Alert tone="neutral" className="mt-6" icon={<LayoutGrid className="h-4 w-4" />}>
        Every tool here works against the same mock dataset the rest of the app uses, so what you see
        stays consistent from one screen to the next.
      </Alert>
    </div>
  );
}

/* ------------------------------------------------------------- Schedule -- */

/** Train Schedule: the full timetable for any train, with fares per class. */
export function Schedule() {
  const { L } = useLocalized();
  const [number, setNumber] = useState('12608');
  const train = getTrain(number);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Train Schedule" subtitle="Full timetable, halts and distances for any train." />

      <div className="card p-4 sm:p-5">
        <Select label="Train" value={number} onChange={(e) => setNumber(e.target.value)}>
          {TRAINS.map((t) => (
            <option key={t.id} value={t.number}>
              {t.number} · {t.name.en}
            </option>
          ))}
        </Select>
      </div>

      {!train ? (
        <div className="mt-5">
          <EmptyState icon={<Timer className="h-5 w-5" />} title="Pick a train" />
        </div>
      ) : (
        <>
          <div className="card mt-5 p-5">
            <p className="text-[1.0625rem] font-bold text-ink">{L(train.name)}</p>
            <p className="tnum mt-0.5 text-[0.8125rem] text-ink-muted">
              {train.number} · {formatDuration(train.duration_minutes)} · {train.distance_km} km ·{' '}
              {Math.round(train.punctuality * 100)}% on time
            </p>

            <div className="mt-4 flex flex-wrap gap-1.5">
              {train.classes.map((c) => {
                const a = availabilityFor(train, c.name, todayISO());
                return (
                  <Badge key={c.name} tone="neutral">
                    {c.name} · {rupees(a.price)}
                  </Badge>
                );
              })}
            </div>
          </div>

          <div className="card mt-4 overflow-x-auto">
            <table className="w-full min-w-[32rem] text-left">
              <thead>
                <tr className="border-b border-line bg-surface-sunk">
                  {['#', 'Station', 'Arrives', 'Departs', 'PF', 'Km'].map((h) => (
                    <th
                      key={h}
                      className="px-3 py-2.5 text-[0.6875rem] font-bold uppercase tracking-wide text-ink-faint"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {train.stops.map((s, i) => (
                  <tr key={s.station} className="border-b border-line last:border-0">
                    <td className="tnum px-3 py-2.5 text-[0.8125rem] text-ink-faint">{i + 1}</td>
                    <td className="px-3 py-2.5 text-[0.8125rem] font-semibold text-ink">
                      {L(getStation(s.station)?.name) || s.station}
                    </td>
                    <td className="tnum px-3 py-2.5 text-[0.8125rem] text-ink-muted">{s.arrival ?? '—'}</td>
                    <td className="tnum px-3 py-2.5 text-[0.8125rem] text-ink-muted">{s.departure ?? '—'}</td>
                    <td className="tnum px-3 py-2.5 text-[0.8125rem] text-ink-muted">{s.platform ?? '—'}</td>
                    <td className="tnum px-3 py-2.5 text-[0.8125rem] text-ink-muted">{s.distance_km}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

/* ----------------------------------------------------- Platform locator -- */

/** Platform Locator: which platform a train uses at a chosen station, live. */
export function PlatformLocator() {
  const { L } = useLocalized();
  const [station, setStation] = useState('MAS');
  const [date] = useState(todayISO());

  const serving = TRAINS.filter((t) => t.stops.some((s) => s.station === station)).slice(0, 10);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Platform Locator"
        subtitle="Which platform each train is using, and how far it is from the entrance."
      />

      <div className="card p-4 sm:p-5">
        <Select label="Station" value={station} onChange={(e) => setStation(e.target.value)}>
          {STATIONS.map((s) => (
            <option key={s.code} value={s.code}>
              {L(s.name)} ({s.code})
            </option>
          ))}
        </Select>
      </div>

      {serving.length === 0 ? (
        <div className="mt-5">
          <EmptyState icon={<MapPin className="h-5 w-5" />} title="No trains call at this station today" />
        </div>
      ) : (
        <ul className="stagger mt-5 space-y-3">
          {serving.map((t) => (
            <PlatformRow key={t.id} trainNumber={t.number} station={station} date={date} />
          ))}
        </ul>
      )}

      <Alert tone="neutral" className="mt-5">
        Platform allocations change close to departure. Alerts are sent the moment one moves.
      </Alert>
    </div>
  );
}

function PlatformRow({
  trainNumber,
  station,
  date,
}: {
  trainNumber: string;
  station: string;
  date: string;
}) {
  const { L } = useLocalized();
  const train = getTrain(trainNumber);
  const live = useLiveTrain(train, date);
  if (!train) return null;

  const stop = train.stops.find((s) => s.station === station);
  const liveStop = live?.stops.find((s) => s.station === station);
  const platform = stop?.platform ?? live?.platform ?? 1;

  return (
    <li className="card flex flex-wrap items-center justify-between gap-4 p-4">
      <div className="min-w-0">
        <p className="truncate text-[0.9375rem] font-bold text-ink">{L(train.name)}</p>
        <p className="tnum mt-0.5 text-[0.8125rem] text-ink-muted">
          {train.number} · {stop?.arrival ?? stop?.departure ?? '—'}
          {liveStop && liveStop.delay_minutes > 0 && (
            <span className="ml-1.5 font-semibold text-attention">
              expected {liveStop.expected}
            </span>
          )}
        </p>
      </div>
      <div className="ml-auto flex items-center gap-3">
        <div className="text-center">
          <p className="text-[0.625rem] font-bold uppercase text-ink-faint">Platform</p>
          <p className="tnum text-[1.5rem] font-extrabold leading-none text-navy-700">{platform}</p>
        </div>
        <Badge tone={liveStop?.state === 'departed' ? 'neutral' : 'confirmed'}>
          {liveStop?.state === 'departed' ? 'Departed' : 'Expected'}
        </Badge>
      </div>
    </li>
  );
}

/* ------------------------------------------------------- Coach position -- */

const COACH_LAYOUT = [
  'ENG', 'SLR', 'GS', 'S1', 'S2', 'S3', 'S4', 'S5', 'PC', 'B1', 'B2', 'B3', 'A1', 'A2', 'H1', 'GS', 'SLR',
];

/** Coach Position: where each coach stops along the platform. */
export function CoachPosition() {
  const { L } = useLocalized();
  const [number, setNumber] = useState('12608');
  const [myCoach, setMyCoach] = useState('B2');
  const train = getTrain(number);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Coach Position"
        subtitle="Where your coach will stop, so you wait in the right place instead of running."
      />

      <div className="card grid gap-3 p-4 sm:grid-cols-2 sm:p-5">
        <Select label="Train" value={number} onChange={(e) => setNumber(e.target.value)}>
          {TRAINS.slice(0, 20).map((t) => (
            <option key={t.id} value={t.number}>
              {t.number} · {t.name.en}
            </option>
          ))}
        </Select>
        <Input
          label="Your coach"
          value={myCoach}
          onChange={(e) => setMyCoach(e.target.value.toUpperCase())}
          placeholder="e.g. B2"
        />
      </div>

      {train && (
        <>
          <div className="card mt-5 p-5">
            <p className="text-[0.9375rem] font-bold text-ink">{L(train.name)}</p>
            <p className="tnum mt-0.5 text-[0.8125rem] text-ink-muted">
              {train.number} · {COACH_LAYOUT.length} coaches
            </p>

            <div className="no-scrollbar mt-5 overflow-x-auto pb-2">
              <div className="flex min-w-max items-end gap-1">
                {COACH_LAYOUT.map((c, i) => {
                  const mine = c === myCoach;
                  return (
                    <div key={`${c}-${i}`} className="flex flex-col items-center gap-1">
                      <span
                        className={cx(
                          'text-[0.625rem] font-bold',
                          mine ? 'text-saffron-600' : 'text-transparent',
                        )}
                      >
                        You
                      </span>
                      <span
                        className={cx(
                          'grid h-12 w-14 place-items-center rounded border-2 text-[0.6875rem] font-bold transition-colors',
                          c === 'ENG'
                            ? 'border-navy-800 bg-navy-800 text-white'
                            : mine
                              ? 'border-saffron-500 bg-saffron-50 text-saffron-700'
                              : 'border-line-strong bg-surface text-ink-muted',
                        )}
                      >
                        {c}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between text-[0.75rem] font-semibold text-ink-faint">
              <span>← Engine end</span>
              <span>Rear end →</span>
            </div>
          </div>

          <Alert
            tone={COACH_LAYOUT.includes(myCoach) ? 'confirmed' : 'attention'}
            className="mt-4"
          >
            {COACH_LAYOUT.includes(myCoach)
              ? `Coach ${myCoach} stops ${COACH_LAYOUT.indexOf(myCoach) + 1} positions from the engine — roughly ${
                  (COACH_LAYOUT.indexOf(myCoach) + 1) * 24
                } metres down the platform.`
              : `We do not have coach ${myCoach} on this train's formation. Check your ticket — the coach code is next to the seat number.`}
          </Alert>
        </>
      )}
    </div>
  );
}
