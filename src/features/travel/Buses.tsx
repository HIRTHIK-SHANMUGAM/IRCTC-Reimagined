import { useMemo, useState } from 'react';
import { Bus as BusIcon, Star } from 'lucide-react';
import { BUSES, type Bus } from '@/data/catalog';
import { formatDuration } from '@/engine/search';
import { rupees, todayISO } from '@/lib/format';
import { Checkout, type CheckoutDraft } from '@/features/common/Checkout';
import {
  Badge,
  Button,
  Chip,
  EmptyState,
  Modal,
  PageHeader,
  Select,
  cx,
} from '@/components/ui';

const CITIES = Array.from(new Set(BUSES.flatMap((b) => [b.from, b.to]))).sort();

type Sort = 'departure' | 'cheapest' | 'rating';

/** Buses (addendum §5): search, operator list, seat-map pick, checkout. */
export function Buses() {
  const [from, setFrom] = useState('Chennai');
  const [to, setTo] = useState('Bengaluru');
  const [date, setDate] = useState(todayISO());
  const [sort, setSort] = useState<Sort>('departure');
  const [acOnly, setAcOnly] = useState(false);
  const [sleeperOnly, setSleeperOnly] = useState(false);
  const [seatBus, setSeatBus] = useState<Bus | null>(null);
  const [seats, setSeats] = useState<string[]>([]);
  const [draft, setDraft] = useState<CheckoutDraft | null>(null);

  const results = useMemo(() => {
    let rows = BUSES.filter((b) => b.from === from && b.to === to);
    if (acOnly) rows = rows.filter((b) => b.ac);
    if (sleeperOnly) rows = rows.filter((b) => b.sleeper);
    return [...rows].sort((a, b) =>
      sort === 'cheapest'
        ? a.fare - b.fare
        : sort === 'rating'
          ? b.rating - a.rating
          : a.departure.localeCompare(b.departure),
    );
  }, [from, to, sort, acOnly, sleeperOnly]);

  function confirmSeats() {
    if (!seatBus || seats.length === 0) return;
    const fare = seatBus.fare * seats.length;
    setDraft({
      category: 'bus',
      offerCategory: 'bus',
      title: `${seatBus.operator} · ${seatBus.type}`,
      subtitle: `${seatBus.from} → ${seatBus.to} · seats ${seats.join(', ')}`,
      date,
      time: seatBus.departure,
      lines: [
        { label: `Fare × ${seats.length}`, amount: fare },
        { label: 'Service charge', amount: 40 },
      ],
      details: {
        Operator: seatBus.operator,
        Type: seatBus.type,
        Boarding: seatBus.boarding,
        Departs: seatBus.departure,
        Arrives: seatBus.arrival,
        Seats: seats.join(', '),
      },
      successNote: 'Your bus is booked',
    });
    setSeatBus(null);
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Buses" subtitle="State and private operators, with a live seat map at selection." />

      <div className="card grid gap-3 p-4 sm:grid-cols-3 sm:p-5">
        <Select label="From" value={from} onChange={(e) => setFrom(e.target.value)}>
          {CITIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </Select>
        <Select label="To" value={to} onChange={(e) => setTo(e.target.value)}>
          {CITIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </Select>
        <div>
          <label htmlFor="bs-date" className="mb-1.5 block text-[0.8125rem] font-semibold text-ink">
            Date
          </label>
          <input
            id="bs-date"
            type="date"
            value={date}
            min={todayISO()}
            onChange={(e) => setDate(e.target.value)}
            className="tnum h-12 w-full rounded-lg border border-line-strong bg-surface px-3.5
                       text-[0.9375rem] text-ink focus:border-navy-500 focus:outline-none focus:ring-2 focus:ring-navy-500/20"
          />
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <Chip active={sort === 'departure'} onClick={() => setSort('departure')}>
          Departure
        </Chip>
        <Chip active={sort === 'cheapest'} onClick={() => setSort('cheapest')}>
          Cheapest
        </Chip>
        <Chip active={sort === 'rating'} onClick={() => setSort('rating')}>
          Top rated
        </Chip>
        <Chip active={acOnly} onClick={() => setAcOnly((v) => !v)}>
          AC only
        </Chip>
        <Chip active={sleeperOnly} onClick={() => setSleeperOnly((v) => !v)}>
          Sleeper only
        </Chip>
        <span className="ml-auto text-[0.8125rem] text-ink-muted">{results.length} services</span>
      </div>

      {results.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            icon={<BusIcon className="h-5 w-5" />}
            title="No services on this route"
            body="Try another city pair, or clear the AC and sleeper filters."
            action={
              <Button
                onClick={() => {
                  setAcOnly(false);
                  setSleeperOnly(false);
                }}
              >
                Clear filters
              </Button>
            }
          />
        </div>
      ) : (
        <ul className="stagger mt-4 space-y-3">
          {results.map((b) => (
            <li key={b.id} className="lift card p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="truncate text-[0.9375rem] font-bold text-ink">{b.operator}</p>
                  <p className="mt-0.5 text-[0.75rem] text-ink-muted">{b.type}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge tone="neutral">
                      <Star className="h-3 w-3 fill-current" /> {b.rating}
                    </Badge>
                    <Badge tone={b.seats_left < 6 ? 'attention' : 'confirmed'}>
                      {b.seats_left} seats left
                    </Badge>
                    <span className="text-[0.75rem] text-ink-muted">Boarding: {b.boarding}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p className="tnum text-[1.0625rem] font-bold text-ink">{b.departure}</p>
                    <p className="text-[0.6875rem] text-ink-muted">{b.from}</p>
                  </div>
                  <div className="min-w-[4.5rem] text-center">
                    <p className="text-[0.6875rem] font-semibold text-ink-faint">
                      {formatDuration(b.duration_minutes)}
                    </p>
                    <div className="my-1 h-px bg-line-strong" />
                  </div>
                  <div className="text-center">
                    <p className="tnum text-[1.0625rem] font-bold text-ink">{b.arrival}</p>
                    <p className="text-[0.6875rem] text-ink-muted">{b.to}</p>
                  </div>
                </div>

                <div className="ml-auto flex items-center gap-3">
                  <p className="tnum text-[1.0625rem] font-extrabold text-ink">{rupees(b.fare)}</p>
                  <Button
                    onClick={() => {
                      setSeatBus(b);
                      setSeats([]);
                    }}
                  >
                    Select seats
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* seat map */}
      <Modal
        open={seatBus !== null}
        onClose={() => setSeatBus(null)}
        title={seatBus ? `${seatBus.operator} · pick your seats` : ''}
        footer={
          <div className="flex items-center justify-between gap-3">
            <p className="tnum text-[0.875rem] text-ink-muted">
              {seats.length} selected ·{' '}
              <strong className="text-ink">{rupees((seatBus?.fare ?? 0) * seats.length)}</strong>
            </p>
            <Button disabled={seats.length === 0} onClick={confirmSeats}>
              Continue
            </Button>
          </div>
        }
      >
        {seatBus && <SeatMap bus={seatBus} selected={seats} onToggle={setSeats} />}
      </Modal>

      <Checkout draft={draft} open={draft !== null} onClose={() => setDraft(null)} />
    </div>
  );
}

/** A simple, honest seat grid — taken seats are visibly unavailable. */
function SeatMap({
  bus,
  selected,
  onToggle,
}: {
  bus: Bus;
  selected: string[];
  onToggle: (s: string[]) => void;
}) {
  const rows = 10;
  const cols = bus.sleeper ? ['A', 'B', 'C'] : ['A', 'B', 'C', 'D'];

  // Deterministic occupancy from the operator id, so it does not reshuffle.
  const taken = new Set<string>();
  let h = bus.id.length * 31;
  for (let r = 1; r <= rows; r++) {
    for (const c of cols) {
      h = (h * 1103515245 + 12345) & 0x7fffffff;
      if (h % 100 < 45) taken.add(`${r}${c}`);
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-3 text-[0.75rem]">
        {[
          ['bg-surface border-line-strong', 'Available'],
          ['bg-navy-700 border-navy-700', 'Selected'],
          ['bg-surface-tint border-line', 'Taken'],
        ].map(([cls, label]) => (
          <span key={label} className="flex items-center gap-1.5 text-ink-muted">
            <span className={cx('h-4 w-4 rounded border', cls)} /> {label}
          </span>
        ))}
      </div>

      <div className="rounded-card border border-line p-4">
        <p className="mb-3 text-center text-[0.6875rem] font-bold uppercase text-ink-faint">Front</p>
        <div className="space-y-2">
          {Array.from({ length: rows }).map((_, ri) => (
            <div key={ri} className="flex items-center justify-center gap-2">
              {cols.map((c, ci) => {
                const id = `${ri + 1}${c}`;
                const isTaken = taken.has(id);
                const isSel = selected.includes(id);
                return (
                  <span key={c} className="flex items-center">
                    {ci === Math.floor(cols.length / 2) && <span className="w-5" />}
                    <button
                      type="button"
                      disabled={isTaken}
                      aria-label={`Seat ${id}${isTaken ? ', taken' : ''}`}
                      aria-pressed={isSel}
                      onClick={() =>
                        onToggle(
                          isSel ? selected.filter((s) => s !== id) : [...selected, id].slice(0, 6),
                        )
                      }
                      className={cx(
                        'tnum h-9 w-9 rounded border text-[0.6875rem] font-bold transition-colors',
                        isTaken
                          ? 'cursor-not-allowed border-line bg-surface-tint text-ink-faint/50'
                          : isSel
                            ? 'border-navy-700 bg-navy-700 text-white'
                            : 'border-line-strong bg-surface text-ink hover:border-navy-400 hover:bg-navy-50',
                      )}
                    >
                      {id}
                    </button>
                  </span>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
