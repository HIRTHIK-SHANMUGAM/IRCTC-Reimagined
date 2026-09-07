import { useState } from 'react';
import {
  Bus,
  Car,
  CheckCircle2,
  Hotel,
  Shield,
  TrainFront,
  UtensilsCrossed,
} from 'lucide-react';
import { PACKAGES, type HolidayPackage } from '@/data/catalog';
import { Photo } from '@/components/art/Photo';
import { rupees, todayISO } from '@/lib/format';
import { Checkout, type CheckoutDraft } from '@/features/common/Checkout';
import { Badge, Button, Chip, Modal, PageHeader, Stepper } from '@/components/ui';

const INCLUSION_ICON = {
  train: TrainFront,
  cab: Car,
  bus: Bus,
  hotel: Hotel,
  meal: UtensilsCrossed,
  insurance: Shield,
};

/** IRCTC Tourism catalogue (addendum §5), with a real detail view and booking. */
export function Packages() {
  const [origin, setOrigin] = useState<string>('All');
  const [detail, setDetail] = useState<HolidayPackage | null>(null);
  const [travellers, setTravellers] = useState(2);
  const [startDate, setStartDate] = useState(todayISO());
  const [draft, setDraft] = useState<CheckoutDraft | null>(null);

  const origins = ['All', ...Array.from(new Set(PACKAGES.map((p) => p.origin)))];
  const rows = origin === 'All' ? PACKAGES : PACKAGES.filter((p) => p.origin === origin);

  function book(p: HolidayPackage) {
    const base = p.price * travellers;
    setDraft({
      category: 'package',
      offerCategory: 'package',
      title: p.name,
      subtitle: `${p.days} days · ${p.destinations.join(', ')} · ${travellers} traveller${travellers === 1 ? '' : 's'}`,
      date: startDate,
      lines: [
        { label: `Package × ${travellers}`, amount: base },
        { label: 'GST (5%)', amount: Math.round(base * 0.05) },
      ],
      details: {
        Package: p.name,
        From: p.origin,
        Covers: p.destinations.join(' → '),
        Duration: `${p.nights}N / ${p.days}D`,
        Starts: startDate,
        Travellers: String(travellers),
      },
      successNote: 'Your holiday is booked',
    });
    setDetail(null);
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Holiday Packages"
        subtitle="Curated IRCTC Tourism itineraries — rail, stays and transfers in one booking."
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {origins.map((o) => (
          <Chip key={o} active={origin === o} onClick={() => setOrigin(o)}>
            {o === 'All' ? 'All departures' : `From ${o}`}
          </Chip>
        ))}
      </div>

      <ul className="stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((p) => (
          <li key={p.id} className="lift card overflow-hidden">
            <div className="relative h-36">
              <Photo
                src={`/images/packages/${p.id}.jpg`}
                scene={p.scene}
                alt={p.name}
                className="absolute inset-0"
              />
              <span className="absolute bottom-3 left-3 right-3">
                <span className="block text-[0.9375rem] font-bold leading-tight text-white drop-shadow">
                  {p.name}
                </span>
                <span className="mt-0.5 block text-[0.6875rem] text-white/85">
                  {p.nights}N / {p.days}D · from {p.origin}
                </span>
              </span>
            </div>
            <div className="p-4">
              <p className="text-[0.75rem] text-ink-muted">{p.destinations.join(' · ')}</p>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {p.inclusions.map((inc) => {
                  const Icon = INCLUSION_ICON[inc];
                  return (
                    <span
                      key={inc}
                      title={inc}
                      className="grid h-7 w-7 place-items-center rounded-md bg-navy-50 text-navy-700"
                    >
                      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                      <span className="sr-only">{inc}</span>
                    </span>
                  );
                })}
              </div>
              <div className="mt-4 flex items-end justify-between gap-2">
                <div>
                  <p className="tnum text-[1.0625rem] font-extrabold text-ink">{rupees(p.price)}</p>
                  <p className="text-[0.6875rem] text-ink-muted">per person</p>
                </div>
                <Button size="sm" onClick={() => setDetail(p)}>
                  View
                </Button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <Modal open={detail !== null} onClose={() => setDetail(null)} title={detail?.name} wide>
        {detail && (
          <div>
            <div className="relative h-40 overflow-hidden rounded-card">
              <Photo
                src={`/images/packages/${detail.id}.jpg`}
                scene={detail.scene}
                alt={detail.name}
                className="absolute inset-0"
              />
            </div>

            <p className="mt-4 text-[0.9375rem] leading-relaxed text-ink">{detail.summary}</p>

            <div className="mt-4 flex flex-wrap gap-2">
              <Badge tone="info">
                {detail.nights}N / {detail.days}D
              </Badge>
              <Badge tone="neutral">From {detail.origin}</Badge>
              {detail.inclusions.map((i) => (
                <Badge key={i} tone="confirmed">
                  <CheckCircle2 className="h-3 w-3" /> {i}
                </Badge>
              ))}
            </div>

            <h3 className="mt-5 text-[0.9375rem] font-bold text-ink">Day by day</h3>
            <ol className="mt-2 space-y-0">
              {detail.itinerary.map((d, i) => (
                <li key={d.day} className="flex gap-3">
                  <span className="flex flex-col items-center">
                    <span className="tnum grid h-7 w-7 shrink-0 place-items-center rounded-full bg-navy-700 text-[0.6875rem] font-bold text-white">
                      {d.day}
                    </span>
                    {i < detail.itinerary.length - 1 && <span className="my-1 w-px flex-1 bg-line" />}
                  </span>
                  <span className="min-w-0 pb-4">
                    <span className="block text-[0.875rem] font-bold text-ink">{d.title}</span>
                    <span className="mt-0.5 block text-[0.8125rem] leading-relaxed text-ink-muted">
                      {d.detail}
                    </span>
                  </span>
                </li>
              ))}
            </ol>

            <div className="mt-5 grid gap-3 border-t border-line pt-5 sm:grid-cols-2">
              <div>
                <label htmlFor="pk-date" className="mb-1.5 block text-[0.8125rem] font-semibold text-ink">
                  Start date
                </label>
                <input
                  id="pk-date"
                  type="date"
                  value={startDate}
                  min={todayISO()}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="tnum h-12 w-full rounded-lg border border-line-strong bg-surface px-3.5 text-[0.9375rem]
                             text-ink focus:border-navy-500 focus:outline-none focus:ring-2 focus:ring-navy-500/20"
                />
              </div>
              <Stepper
                label="Travellers"
                value={travellers}
                onChange={setTravellers}
                min={1}
                max={8}
                suffix="Traveller"
              />
            </div>

            <div className="mt-4 flex items-center justify-between gap-3 rounded-card bg-surface-sunk p-4">
              <div>
                <p className="text-[0.75rem] text-ink-muted">Total for {travellers}</p>
                <p className="tnum text-[1.25rem] font-extrabold text-ink">
                  {rupees(detail.price * travellers)}
                </p>
              </div>
              <Button size="lg" onClick={() => book(detail)}>
                Book Now
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Checkout draft={draft} open={draft !== null} onClose={() => setDraft(null)} />
    </div>
  );
}
