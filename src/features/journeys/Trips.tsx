import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Armchair,
  BedDouble,
  Building2,
  Bus,
  Car,
  Package,
  Plane,
  Share2,
  Ticket,
  TrainFront,
  UtensilsCrossed,
} from 'lucide-react';
import type { Booking, BookingCategory, Journey } from '@/types';
import { getStation } from '@/data/stations';
import { useSession } from '@/store/session';
import { useLocalized } from '@/hooks/useLocalized';
import { formatDate, rupees, todayISO } from '@/lib/format';
import {
  Badge,
  Button,
  EmptyState,
  Modal,
  PageHeader,
  Tabs,
  cx,
  useToast,
} from '@/components/ui';

const CATEGORY_ICON: Record<BookingCategory, typeof Ticket> = {
  train: TrainFront,
  flight: Plane,
  bus: Bus,
  hotel: Building2,
  cab: Car,
  package: Package,
  activity: Ticket,
  food: UtensilsCrossed,
  retiring: BedDouble,
  lounge: Armchair,
};

const CATEGORY_LABEL: Record<BookingCategory, string> = {
  train: 'Train',
  flight: 'Flight',
  bus: 'Bus',
  hotel: 'Hotel',
  cab: 'Cab',
  package: 'Holiday',
  activity: 'Activity',
  food: 'Food',
  retiring: 'Retiring room',
  lounge: 'Lounge',
};

type Tab = 'upcoming' | 'completed' | 'cancelled';

/** A journey and a booking rendered through one shape. */
interface Trip {
  id: string;
  category: BookingCategory;
  reference: string;
  title: string;
  subtitle: string;
  date: string;
  time?: string;
  status: string;
  total: number;
  details: Record<string, string>;
  journey?: Journey;
  booking?: Booking;
}

/**
 * My Trips (addendum §5). Aggregates train journeys and every other category
 * into one list, each with its own icon and category label, split across
 * Upcoming / Completed / Cancelled.
 */
export function Trips() {
  const navigate = useNavigate();
  const toast = useToast();
  const { L } = useLocalized();

  const journeys = useSession((s) => s.journeys);
  const bookings = useSession((s) => s.bookings);
  const cancelJourney = useSession((s) => s.cancelJourney);
  const cancelBooking = useSession((s) => s.cancelBooking);

  const [tab, setTab] = useState<Tab>('upcoming');
  const [detail, setDetail] = useState<Trip | null>(null);
  const [confirmCancel, setConfirmCancel] = useState<Trip | null>(null);
  const [busy, setBusy] = useState(false);

  const trips: Trip[] = useMemo(() => {
    const fromJourneys: Trip[] = journeys.map((j) => ({
      id: j.id,
      category: 'train',
      reference: j.pnr,
      title: `${L(j.train_name)} (${j.train_number})`,
      subtitle: `${L(getStation(j.from_station)?.name)} → ${L(getStation(j.to_station)?.name)}`,
      date: j.journey_date,
      time: j.departure_time,
      status: j.status,
      total: j.total_fare,
      details: {
        PNR: j.pnr,
        Class: j.class,
        Quota: j.quota,
        Coach: j.passengers[0]?.coach ?? '—',
        Seat: j.passengers.map((p) => p.seat_number).join(', ') || '—',
        Passengers: j.passengers.map((p) => p.name).join(', '),
        Departs: j.departure_time,
        Arrives: j.arrival_time,
        Fare: rupees(j.total_fare),
      },
      journey: j,
    }));

    const fromBookings: Trip[] = bookings.map((b) => ({
      id: b.id,
      category: b.category,
      reference: b.reference,
      title: b.title,
      subtitle: b.subtitle,
      date: b.date,
      time: b.time,
      status: b.status,
      total: b.total,
      details: b.details,
      booking: b,
    }));

    return [...fromJourneys, ...fromBookings].sort((a, b) => b.date.localeCompare(a.date));
  }, [journeys, bookings, L]);

  const today = todayISO();
  const buckets = {
    upcoming: trips.filter((t) => t.status !== 'cancelled' && t.date >= today),
    completed: trips.filter((t) => t.status !== 'cancelled' && t.date < today),
    cancelled: trips.filter((t) => t.status === 'cancelled'),
  };
  const rows = buckets[tab];

  async function doCancel() {
    if (!confirmCancel) return;
    setBusy(true);
    try {
      if (confirmCancel.journey) {
        await cancelJourney(confirmCancel.id, 'Cancelled by traveller');
      } else {
        await cancelBooking(confirmCancel.id, 'Cancelled by traveller');
      }
      toast('Cancelled. Your refund is on its way to the wallet.');
      setConfirmCancel(null);
      setDetail(null);
      setTab('cancelled');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="My Trips"
        subtitle="Everything you have booked — trains, flights, stays and the rest — in one place."
      />

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'upcoming', label: 'Upcoming', count: buckets.upcoming.length },
          { id: 'completed', label: 'Completed', count: buckets.completed.length },
          { id: 'cancelled', label: 'Cancelled', count: buckets.cancelled.length },
        ]}
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={<Ticket className="h-5 w-5" />}
          title={
            tab === 'upcoming'
              ? 'Nothing booked yet'
              : tab === 'completed'
                ? 'No completed trips'
                : 'Nothing cancelled'
          }
          body={
            tab === 'upcoming'
              ? 'Search for a train, or ask the Assistant to plan something.'
              : undefined
          }
          action={tab === 'upcoming' ? <Button onClick={() => navigate('/')}>Find a train</Button> : undefined}
        />
      ) : (
        <ul className="stagger space-y-3">
          {rows.map((t) => {
            const Icon = CATEGORY_ICON[t.category];
            return (
              <li key={t.id} className="lift card p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <span
                      className={cx(
                        'grid h-11 w-11 shrink-0 place-items-center rounded-lg',
                        t.status === 'cancelled' ? 'bg-surface-tint text-ink-faint' : 'bg-navy-50 text-navy-700',
                      )}
                    >
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone="neutral">{CATEGORY_LABEL[t.category]}</Badge>
                        <Badge
                          tone={
                            t.status === 'cancelled'
                              ? 'critical'
                              : t.status === 'confirmed'
                                ? 'confirmed'
                                : 'attention'
                          }
                        >
                          {t.status}
                        </Badge>
                      </div>
                      <p className="mt-1.5 truncate text-[0.9375rem] font-bold text-ink">{t.title}</p>
                      <p className="mt-0.5 truncate text-[0.8125rem] text-ink-muted">{t.subtitle}</p>
                      <p className="tnum mt-1 text-[0.75rem] font-semibold text-ink-muted">
                        {formatDate(t.date)}
                        {t.time ? ` · ${t.time}` : ''} · {t.reference}
                      </p>
                    </div>
                  </div>

                  <div className="ml-auto flex flex-col items-end gap-2">
                    <p className="tnum text-[1rem] font-extrabold text-ink">{rupees(t.total)}</p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="secondary" onClick={() => setDetail(t)}>
                        View ticket
                      </Button>
                      {t.status !== 'cancelled' && t.date >= today && (
                        <Button size="sm" variant="ghost" onClick={() => setConfirmCancel(t)}>
                          Cancel
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* ticket detail */}
      <Modal open={detail !== null} onClose={() => setDetail(null)} title={detail?.title} wide>
        {detail && (
          <div>
            <p className="text-[0.875rem] text-ink-muted">{detail.subtitle}</p>
            <div className="mt-4 rounded-card border border-line bg-surface-sunk p-4">
              <p className="text-[0.6875rem] font-bold uppercase text-ink-faint">Reference</p>
              <p className="tnum mt-1 text-[1.25rem] font-extrabold tracking-wide text-navy-700">
                {detail.reference}
              </p>
            </div>
            <dl className="mt-4 grid gap-x-6 gap-y-2.5 sm:grid-cols-2">
              {Object.entries(detail.details).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3 border-b border-line pb-2">
                  <dt className="text-[0.8125rem] text-ink-muted">{k}</dt>
                  <dd className="tnum text-right text-[0.8125rem] font-semibold text-ink">{v}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button
                icon={<Share2 className="h-4 w-4" />}
                onClick={() => {
                  void navigator.clipboard
                    ?.writeText(`${detail.title} · ${detail.reference} · ${detail.date}`)
                    .then(() => toast('Ticket details copied'))
                    .catch(() => toast('Could not copy'));
                }}
              >
                Share
              </Button>
              {detail.category === 'train' && (
                <Button variant="secondary" onClick={() => navigate('/live-status')}>
                  Track live
                </Button>
              )}
              {detail.status === 'cancelled' && (
                <Link
                  to="/tdr"
                  className="inline-flex h-11 items-center rounded-lg border border-line-strong px-5 text-[0.875rem] font-semibold text-navy-700 hover:bg-navy-50"
                >
                  File a TDR
                </Link>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* cancel confirmation — the refund is stated before the button */}
      <Modal
        open={confirmCancel !== null}
        onClose={() => setConfirmCancel(null)}
        title="Cancel this booking?"
      >
        {confirmCancel && (
          <div>
            <p className="text-[0.9375rem] text-ink">
              <strong>{confirmCancel.title}</strong> on {formatDate(confirmCancel.date)}.
            </p>
            <dl className="mt-4 rounded-card border border-line">
              <div className="flex justify-between border-b border-line px-4 py-2.5">
                <dt className="text-[0.875rem] text-ink-muted">You paid</dt>
                <dd className="tnum text-[0.875rem] font-semibold text-ink">
                  {rupees(confirmCancel.total)}
                </dd>
              </div>
              <div className="flex justify-between border-b border-line px-4 py-2.5">
                <dt className="text-[0.875rem] text-ink-muted">Cancellation charge</dt>
                <dd className="tnum text-[0.875rem] font-semibold text-critical">
                  −{rupees(Math.round(confirmCancel.total * 0.2))}
                </dd>
              </div>
              <div className="flex justify-between bg-surface-sunk px-4 py-3">
                <dt className="text-[0.9375rem] font-bold text-ink">You get back</dt>
                <dd className="tnum text-[1rem] font-extrabold text-confirmed">
                  {rupees(Math.round(confirmCancel.total * 0.8))}
                </dd>
              </div>
            </dl>
            <p className="mt-3 text-[0.8125rem] text-ink-muted">
              The refund is credited to your IRCTC eWallet straight away.
            </p>
            <div className="mt-5 flex gap-2">
              <Button variant="secondary" full onClick={() => setConfirmCancel(null)}>
                Keep booking
              </Button>
              <Button variant="danger" full loading={busy} onClick={() => void doCancel()}>
                Cancel &amp; refund
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
