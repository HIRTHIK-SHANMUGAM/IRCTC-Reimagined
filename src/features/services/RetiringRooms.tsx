import { useState } from 'react';
import { BedDouble, Snowflake } from 'lucide-react';
import { RETIRING_ROOMS } from '@/data/catalog';
import { getStation } from '@/data/stations';
import { useLocalized } from '@/hooks/useLocalized';
import { rupees, todayISO } from '@/lib/format';
import { Checkout, type CheckoutDraft } from '@/features/common/Checkout';
import { Badge, Button, Chip, EmptyState, PageHeader, Select } from '@/components/ui';

const STATIONS_WITH_ROOMS = Array.from(new Set(RETIRING_ROOMS.map((r) => r.station)));

/** Retiring Rooms (addendum §5): station + duration search, then a booking. */
export function RetiringRooms() {
  const { L } = useLocalized();
  const [station, setStation] = useState(STATIONS_WITH_ROOMS[0]);
  const [date, setDate] = useState(todayISO());
  const [duration, setDuration] = useState<12 | 24>(12);
  const [draft, setDraft] = useState<CheckoutDraft | null>(null);

  const rows = RETIRING_ROOMS.filter((r) => r.station === station);

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Retiring Rooms"
        subtitle="Rooms and dormitories inside the station, for a long wait or an early departure."
      />

      <div className="card grid gap-3 p-4 sm:grid-cols-3 sm:p-5">
        <Select label="Station" value={station} onChange={(e) => setStation(e.target.value)}>
          {STATIONS_WITH_ROOMS.map((s) => (
            <option key={s} value={s}>
              {L(getStation(s)?.name)} ({s})
            </option>
          ))}
        </Select>
        <div>
          <label htmlFor="rr-date" className="mb-1.5 block text-[0.8125rem] font-semibold text-ink">
            Check-in date
          </label>
          <input
            id="rr-date"
            type="date"
            value={date}
            min={todayISO()}
            onChange={(e) => setDate(e.target.value)}
            className="tnum h-12 w-full rounded-lg border border-line-strong bg-surface px-3.5 text-[0.9375rem]
                       text-ink focus:border-navy-500 focus:outline-none focus:ring-2 focus:ring-navy-500/20"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-[0.8125rem] font-semibold text-ink">Duration</label>
          <div className="flex gap-2">
            <Chip active={duration === 12} onClick={() => setDuration(12)}>
              12 hours
            </Chip>
            <Chip active={duration === 24} onClick={() => setDuration(24)}>
              24 hours
            </Chip>
          </div>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="mt-4">
          <EmptyState icon={<BedDouble className="h-5 w-5" />} title="No rooms listed at this station" />
        </div>
      ) : (
        <ul className="stagger mt-4 space-y-3">
          {rows.map((r) => {
            const price = duration === 12 ? r.price_12h : r.price_24h;
            return (
              <li key={r.id} className="lift card flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5">
                <div className="min-w-0">
                  <p className="text-[0.9375rem] font-bold text-ink">{r.type}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {r.ac && (
                      <Badge tone="info">
                        <Snowflake className="h-3 w-3" /> AC
                      </Badge>
                    )}
                    <Badge tone={r.available < 3 ? 'attention' : 'confirmed'}>
                      {r.available} available
                    </Badge>
                    {r.amenities.map((a) => (
                      <Badge key={a} tone="neutral">
                        {a}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="ml-auto flex items-center gap-3">
                  <div className="text-right">
                    <p className="tnum text-[1.0625rem] font-extrabold text-ink">{rupees(price)}</p>
                    <p className="text-[0.6875rem] text-ink-muted">for {duration} hours</p>
                  </div>
                  <Button
                    onClick={() =>
                      setDraft({
                        category: 'retiring',
                        offerCategory: 'all',
                        title: `${r.type} · ${L(getStation(r.station)?.name)}`,
                        subtitle: `${duration}-hour stay at ${r.station}`,
                        date,
                        lines: [
                          { label: `${r.type} (${duration}h)`, amount: price },
                          { label: 'GST', amount: Math.round(price * 0.12) },
                        ],
                        details: {
                          Station: `${L(getStation(r.station)?.name)} (${r.station})`,
                          Room: r.type,
                          'Check-in': date,
                          Duration: `${duration} hours`,
                          Beds: String(r.beds),
                        },
                        successNote: 'Your room is booked',
                      })
                    }
                  >
                    Book
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Checkout draft={draft} open={draft !== null} onClose={() => setDraft(null)} />
    </div>
  );
}
