import { useState } from 'react';
import { Briefcase, Car, MapPin, Star, Users } from 'lucide-react';
import { CAB_TYPES, DRIVERS, type CabType } from '@/data/catalog';
import { rupees, todayISO } from '@/lib/format';
import { Checkout, type CheckoutDraft } from '@/features/common/Checkout';
import { Alert, Badge, Button, Input, PageHeader, cx } from '@/components/ui';

/** Cabs (addendum §5): pickup/drop, cab-type list with estimates, confirmation. */
export function Cabs() {
  const [pickup, setPickup] = useState('Chennai Central (MAS)');
  const [drop, setDrop] = useState('Chennai Airport (MAA)');
  const [date, setDate] = useState(todayISO());
  const [time, setTime] = useState('09:00');
  const [picked, setPicked] = useState<CabType | null>(null);
  const [draft, setDraft] = useState<CheckoutDraft | null>(null);

  // Distance is derived from the text so the estimate is stable per route.
  const distanceKm = Math.max(6, ((pickup.length + drop.length) % 28) + 8);

  function book(c: CabType) {
    const fare = c.base + c.per_km * distanceKm;
    const driver = DRIVERS[(c.name.length + distanceKm) % DRIVERS.length];
    setDraft({
      category: 'cab',
      offerCategory: 'all',
      title: `${c.name} · ${c.category}`,
      subtitle: `${pickup} → ${drop}`,
      date,
      time,
      lines: [
        { label: 'Base fare', amount: c.base },
        { label: `Distance ${distanceKm} km × ${rupees(c.per_km)}`, amount: c.per_km * distanceKm },
        { label: 'Toll & parking estimate', amount: 60 },
      ],
      details: {
        Vehicle: `${c.name} (${c.examples})`,
        Pickup: pickup,
        Drop: drop,
        When: `${date} ${time}`,
        Driver: driver.name,
        'Vehicle no.': driver.vehicle,
        Distance: `${distanceKm} km`,
        Fare: rupees(fare),
      },
      successNote: 'Your cab is confirmed',
    });
    setPicked(null);
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Cabs" subtitle="Station transfers and outstation runs, priced before you book." />

      <div className="card space-y-3 p-4 sm:p-5">
        <Input
          label="Pickup"
          value={pickup}
          onChange={(e) => setPickup(e.target.value)}
          lead={<MapPin className="h-4 w-4" />}
        />
        <Input
          label="Drop"
          value={drop}
          onChange={(e) => setDrop(e.target.value)}
          lead={<MapPin className="h-4 w-4" />}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="cb-date" className="mb-1.5 block text-[0.8125rem] font-semibold text-ink">
              Date
            </label>
            <input
              id="cb-date"
              type="date"
              value={date}
              min={todayISO()}
              onChange={(e) => setDate(e.target.value)}
              className="tnum h-12 w-full rounded-lg border border-line-strong bg-surface px-3.5 text-[0.9375rem]
                         text-ink focus:border-navy-500 focus:outline-none focus:ring-2 focus:ring-navy-500/20"
            />
          </div>
          <div>
            <label htmlFor="cb-time" className="mb-1.5 block text-[0.8125rem] font-semibold text-ink">
              Pickup time
            </label>
            <input
              id="cb-time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="tnum h-12 w-full rounded-lg border border-line-strong bg-surface px-3.5 text-[0.9375rem]
                         text-ink focus:border-navy-500 focus:outline-none focus:ring-2 focus:ring-navy-500/20"
            />
          </div>
        </div>
      </div>

      <Alert tone="info" className="mt-4">
        Estimated distance for this route is <strong className="tnum">{distanceKm} km</strong>. The fare
        below is the full amount — tolls and parking are already included in the estimate.
      </Alert>

      <ul className="stagger mt-4 space-y-3">
        {CAB_TYPES.map((c) => {
          const fare = c.base + c.per_km * distanceKm + 60;
          const active = picked?.id === c.id;
          return (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => setPicked(c)}
                className={cx(
                  'lift w-full rounded-card border bg-surface p-4 text-left shadow-card transition-colors',
                  active ? 'border-navy-600 ring-2 ring-navy-500/20' : 'border-line',
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-navy-50">
                      <Car className="h-5 w-5 text-navy-700" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[0.9375rem] font-bold text-ink">
                        {c.name} <span className="font-medium text-ink-muted">· {c.category}</span>
                      </p>
                      <p className="mt-0.5 text-[0.75rem] text-ink-muted">{c.examples}</p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        <Badge tone="neutral">
                          <Users className="h-3 w-3" /> {c.seats}
                        </Badge>
                        <Badge tone="neutral">
                          <Briefcase className="h-3 w-3" /> {c.bags} bags
                        </Badge>
                        <Badge tone="confirmed">{c.eta_minutes} min away</Badge>
                      </div>
                    </div>
                  </div>
                  <div className="ml-auto text-right">
                    <p className="tnum text-[1.125rem] font-extrabold text-ink">{rupees(fare)}</p>
                    <p className="text-[0.6875rem] text-ink-muted">all inclusive</p>
                  </div>
                </div>
              </button>
            </li>
          );
        })}
      </ul>

      {picked && (
        <div className="sticky bottom-4 mt-5">
          <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <p className="text-[0.875rem] font-bold text-ink">{picked.name} selected</p>
              <p className="flex items-center gap-1 text-[0.75rem] text-ink-muted">
                <Star className="h-3 w-3 fill-current text-saffron-500" />
                Driver assigned at confirmation
              </p>
            </div>
            <Button size="lg" onClick={() => book(picked)}>
              Confirm {picked.name} · {rupees(picked.base + picked.per_km * distanceKm + 60)}
            </Button>
          </div>
        </div>
      )}

      <Checkout draft={draft} open={draft !== null} onClose={() => setDraft(null)} />
    </div>
  );
}
