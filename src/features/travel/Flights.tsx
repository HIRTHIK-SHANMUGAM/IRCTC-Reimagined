import { useMemo, useState } from 'react';
import { ArrowRightLeft, Clock, Plane } from 'lucide-react';
import { AIRPORTS, FLIGHTS, type Flight } from '@/data/catalog';
import { formatDuration } from '@/engine/search';
import { rupees, todayISO } from '@/lib/format';
import { Checkout, type CheckoutDraft } from '@/features/common/Checkout';
import {
  Badge,
  Button,
  Chip,
  EmptyState,
  PageHeader,
  Select,
  Stepper,
  cx,
} from '@/components/ui';

type Cabin = 'economy' | 'premium' | 'business';
type Sort = 'cheapest' | 'fastest' | 'earliest';

const CABINS: { id: Cabin; label: string }[] = [
  { id: 'economy', label: 'Economy' },
  { id: 'premium', label: 'Premium Economy' },
  { id: 'business', label: 'Business' },
];

/** Flights (addendum §5): search, results, cabin select, checkout, confirmation. */
export function Flights() {
  const [from, setFrom] = useState('MAA');
  const [to, setTo] = useState('BLR');
  const [date, setDate] = useState(todayISO());
  const [cabin, setCabin] = useState<Cabin>('economy');
  const [pax, setPax] = useState(1);
  const [sort, setSort] = useState<Sort>('cheapest');
  const [nonStopOnly, setNonStopOnly] = useState(false);
  const [draft, setDraft] = useState<CheckoutDraft | null>(null);

  const results = useMemo(() => {
    let rows = FLIGHTS.filter((f) => f.from === from && f.to === to);
    if (nonStopOnly) rows = rows.filter((f) => f.stops === 0);
    return [...rows].sort((a, b) =>
      sort === 'cheapest'
        ? a.fare[cabin] - b.fare[cabin]
        : sort === 'fastest'
          ? a.duration_minutes - b.duration_minutes
          : a.departure.localeCompare(b.departure),
    );
  }, [from, to, cabin, sort, nonStopOnly]);

  function book(f: Flight) {
    const fare = f.fare[cabin] * pax;
    setDraft({
      category: 'flight',
      offerCategory: 'flight',
      title: `${f.airline} ${f.code}`,
      subtitle: `${cityOf(f.from)} → ${cityOf(f.to)} · ${CABINS.find((c) => c.id === cabin)?.label}`,
      date,
      time: f.departure,
      lines: [
        { label: `Base fare × ${pax}`, amount: fare },
        { label: 'Taxes & surcharges', amount: Math.round(fare * 0.12) },
        { label: 'Convenience fee', amount: 199 },
      ],
      details: {
        Flight: f.code,
        Route: `${f.from} → ${f.to}`,
        Departs: f.departure,
        Arrives: f.arrival,
        Cabin: CABINS.find((c) => c.id === cabin)?.label ?? cabin,
        Passengers: String(pax),
      },
      successNote: 'Your flight is booked',
    });
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Flights"
        subtitle="Domestic fares across the IRCTC Air network. Mock inventory, real booking flow."
      />

      <div className="card p-4 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr]">
          <Select label="From" value={from} onChange={(e) => setFrom(e.target.value)}>
            {AIRPORTS.map((a) => (
              <option key={a.code} value={a.code}>
                {a.city} ({a.code})
              </option>
            ))}
          </Select>
          <div className="flex items-end justify-center pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => {
                setFrom(to);
                setTo(from);
              }}
              aria-label="Swap airports"
              className="grid h-11 w-11 place-items-center rounded-full border border-line-strong bg-surface
                         text-navy-700 transition-all duration-150 hover:rotate-180 hover:bg-navy-50"
            >
              <ArrowRightLeft className="h-4 w-4" />
            </button>
          </div>
          <Select label="To" value={to} onChange={(e) => setTo(e.target.value)}>
            {AIRPORTS.map((a) => (
              <option key={a.code} value={a.code}>
                {a.city} ({a.code})
              </option>
            ))}
          </Select>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div>
            <label htmlFor="fl-date" className="mb-1.5 block text-[0.8125rem] font-semibold text-ink">
              Date
            </label>
            <input
              id="fl-date"
              type="date"
              value={date}
              min={todayISO()}
              onChange={(e) => setDate(e.target.value)}
              className="tnum h-12 w-full rounded-lg border border-line-strong bg-surface px-3.5
                         text-[0.9375rem] text-ink focus:border-navy-500 focus:outline-none focus:ring-2 focus:ring-navy-500/20"
            />
          </div>
          <Select label="Cabin" value={cabin} onChange={(e) => setCabin(e.target.value as Cabin)}>
            {CABINS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </Select>
          <Stepper label="Passengers" value={pax} onChange={setPax} min={1} max={6} suffix="Traveller" />
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <Chip active={sort === 'cheapest'} onClick={() => setSort('cheapest')}>
          Cheapest
        </Chip>
        <Chip active={sort === 'fastest'} onClick={() => setSort('fastest')}>
          Fastest
        </Chip>
        <Chip active={sort === 'earliest'} onClick={() => setSort('earliest')}>
          Earliest
        </Chip>
        <Chip active={nonStopOnly} onClick={() => setNonStopOnly((v) => !v)}>
          Non-stop only
        </Chip>
        <span className="ml-auto text-[0.8125rem] text-ink-muted">
          {results.length} flight{results.length === 1 ? '' : 's'}
        </span>
      </div>

      {results.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            icon={<Plane className="h-5 w-5" />}
            title="No flights on this route"
            body="Try another pair of cities, or clear the non-stop filter."
            action={<Button onClick={() => setNonStopOnly(false)}>Clear filters</Button>}
          />
        </div>
      ) : (
        <ul className="stagger mt-4 space-y-3">
          {results.map((f) => (
            <li key={f.id} className="lift card p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-navy-50">
                    <Plane className="h-5 w-5 text-navy-700" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[0.9375rem] font-bold text-ink">{f.airline}</p>
                    <p className="tnum text-[0.75rem] text-ink-muted">{f.code}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p className="tnum text-[1.0625rem] font-bold text-ink">{f.departure}</p>
                    <p className="text-[0.6875rem] text-ink-muted">{f.from}</p>
                  </div>
                  <div className="min-w-[5rem] text-center">
                    <p className="text-[0.6875rem] font-semibold text-ink-faint">
                      {formatDuration(f.duration_minutes)}
                    </p>
                    <div className="my-1 h-px bg-line-strong" />
                    <p className="text-[0.6875rem] text-ink-faint">
                      {f.stops === 0 ? 'Non-stop' : `${f.stops} stop`}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="tnum text-[1.0625rem] font-bold text-ink">{f.arrival}</p>
                    <p className="text-[0.6875rem] text-ink-muted">{f.to}</p>
                  </div>
                </div>

                <div className="ml-auto flex items-center gap-3">
                  <div className="text-right">
                    <p className="tnum text-[1.0625rem] font-extrabold text-ink">
                      {rupees(f.fare[cabin])}
                    </p>
                    <p className="text-[0.6875rem] text-ink-muted">per traveller</p>
                  </div>
                  <Button onClick={() => book(f)}>Select</Button>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
                <Badge tone={f.seats_left < 8 ? 'attention' : 'confirmed'}>
                  {f.seats_left} seats left
                </Badge>
                <Badge tone="neutral">
                  <Clock className="h-3 w-3" /> {f.on_time}% on time
                </Badge>
                <span className={cx('text-[0.75rem] text-ink-muted')}>
                  {CABINS.find((c) => c.id === cabin)?.label} · free cabin bag
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Checkout draft={draft} open={draft !== null} onClose={() => setDraft(null)} />
    </div>
  );
}

function cityOf(code: string): string {
  return AIRPORTS.find((a) => a.code === code)?.city ?? code;
}
