import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MapPin, Repeat, Share2, Ticket, X } from 'lucide-react';
import type { Journey } from '@/types';
import { useSession } from '@/store/session';
import { useBooking } from '@/store/booking';
import { useLocalized } from '@/hooks/useLocalized';
import { Badge, Button, EmptyState, Input, Modal, StatusDot, Tabs, Toast, cx } from '@/components/ui';
import { RouteRail } from '@/components/motion/Microinteractions';
import { getStation } from '@/data/stations';
import { getTrain } from '@/data/trains';
import { rankTrains } from '@/engine/search';
import { formatDate, relativeDay, rupees, todayISO } from '@/lib/format';

type Tab = 'upcoming' | 'completed' | 'cancelled';

export function Trips() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const journeys = useSession((s) => s.journeys);
  const [tab, setTab] = useState<Tab>('upcoming');
  const [cancelling, setCancelling] = useState<Journey | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const highlight = params.get('journey');
  const today = todayISO();

  const grouped = useMemo(() => {
    const upcoming = journeys.filter(
      (j) => j.status !== 'cancelled' && j.status !== 'completed' && j.journey_date >= today,
    );
    const completed = journeys.filter(
      (j) => j.status === 'completed' || (j.status !== 'cancelled' && j.journey_date < today),
    );
    const cancelled = journeys.filter((j) => j.status === 'cancelled');
    return { upcoming, completed, cancelled };
  }, [journeys, today]);

  const rows = grouped[tab];

  return (
    <div className="space-y-6">
      <h1 className="font-display text-4xl leading-tight">{t('trips.title')}</h1>

      <Tabs<Tab>
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'upcoming', label: t('trips.upcoming'), count: grouped.upcoming.length },
          { id: 'completed', label: t('trips.completed'), count: grouped.completed.length },
          { id: 'cancelled', label: t('trips.cancelled'), count: grouped.cancelled.length },
        ]}
      />

      {rows.length === 0 ? (
        <EmptyState
          title={t('trips.empty')}
          body={tab === 'upcoming' ? t('trips.emptyUpcoming') : undefined}
          art={<Ticket className="h-7 w-7 text-ink-faint" aria-hidden="true" />}
          action={
            tab === 'upcoming' ? (
              <Button onClick={() => navigate('/book')}>{t('nav.book')}</Button>
            ) : undefined
          }
        />
      ) : (
        <ul className="space-y-4">
          {rows.map((j) => (
            <li key={j.id}>
              <TripCard
                journey={j}
                highlighted={highlight === j.id}
                onCancel={() => setCancelling(j)}
                onToast={setToast}
              />
            </li>
          ))}
        </ul>
      )}

      <CancelModal
        journey={cancelling}
        onClose={() => setCancelling(null)}
        onDone={() => setToast('Journey cancelled. Your refund is on its way.')}
      />
      <Toast message={toast} onDone={() => setToast(null)} />
    </div>
  );
}

function TripCard({
  journey,
  highlighted,
  onCancel,
  onToast,
}: {
  journey: Journey;
  highlighted: boolean;
  onCancel: () => void;
  onToast: (m: string) => void;
}) {
  const { t } = useTranslation();
  const { L } = useLocalized();
  const navigate = useNavigate();
  const booking = useBooking();
  const people = useSession((s) => s.people);

  const today = todayISO();
  const upcoming = journey.journey_date >= today && journey.status !== 'cancelled';
  const tone =
    journey.status === 'confirmed'
      ? 'confirmed'
      : journey.status === 'RAC'
        ? 'attention'
        : journey.status === 'cancelled'
          ? 'critical'
          : journey.status === 'completed'
            ? 'neutral'
            : 'attention';

  // How far along the journey is, for the progress rail.
  const progress =
    journey.status === 'completed' ? 1 : journey.journey_date > today ? 0 : 0.45;

  /** Rebook: same route and class, next available date. */
  const rebook = () => {
    const train = getTrain(journey.train_id);
    if (!train) return;
    const date = journey.journey_date >= today ? journey.journey_date : today;
    const rows = rankTrains({
      from: journey.from_station,
      to: journey.to_station,
      date,
      travel_class: journey.class,
      quota: 'General',
      passengers: journey.passengers.length,
    });
    const match = rows.find((r) => r.train.id === journey.train_id) ?? rows[0];
    if (!match) {
      onToast('Nothing runs that route on the next available date.');
      return;
    }
    booking.setQuery({
      from: journey.from_station,
      to: journey.to_station,
      date,
      travel_class: journey.class,
      quota: 'General',
      passengers: journey.passengers.length,
    });
    booking.select(match);
    booking.setPassengers(
      journey.passengers
        .map((p) => people.find((x) => x.id === p.person_id))
        .filter((p): p is NonNullable<typeof p> => Boolean(p)),
    );
    navigate('/book/passengers');
  };

  const share = async () => {
    const text =
      `${L(journey.train_name)} (${journey.train_number})\n` +
      `${L(getStation(journey.from_station)?.name)} → ${L(getStation(journey.to_station)?.name)}\n` +
      `${formatDate(journey.journey_date)} · ${journey.departure_time}`;
    try {
      if (navigator.share) await navigator.share({ title: 'My journey', text });
      else await navigator.clipboard.writeText(text);
      onToast(t('success.shareCopied'));
    } catch {
      /* dismissed */
    }
  };

  return (
    <article
      className={cx(
        'card overflow-hidden transition-shadow',
        highlighted && 'border-teal-700 ring-1 ring-teal-700',
      )}
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="truncate font-display text-xl leading-tight">{L(journey.train_name)}</h3>
            <p className="label mt-1.5">
              {journey.train_number} · {t(`classes.${journey.class}`)}
            </p>
          </div>
          <Badge tone={tone}>
            <StatusDot tone={tone} />
            {t(`status.${journey.status}`)}
          </Badge>
        </div>

        <div className="mt-5 flex items-center gap-4">
          <div>
            <div className="tnum text-lg font-semibold leading-none">{journey.departure_time}</div>
            <div className="label mt-1.5">{getStation(journey.from_station)?.code}</div>
          </div>
          <div className="min-w-0 flex-1 pt-1">
            <RouteRail
              progress={progress}
              compact
              from={getStation(journey.from_station)?.code ?? ''}
              to={getStation(journey.to_station)?.code ?? ''}
            />
          </div>
          <div className="text-right">
            <div className="tnum text-lg font-semibold leading-none">{journey.arrival_time}</div>
            <div className="label mt-1.5">{getStation(journey.to_station)?.code}</div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-rule pt-4 text-sm text-ink-muted">
          <span>
            {relativeDay(journey.journey_date)} · {formatDate(journey.journey_date)}
          </span>
          <span>
            {journey.passengers.length}{' '}
            {journey.passengers.length === 1 ? t('common.traveller') : t('common.travellers')}
          </span>
          {journey.passengers[0]?.coach !== '—' && (
            <span>
              <span className="label">{t('success.coach')}</span>{' '}
              <span className="tnum font-medium text-ink">{journey.passengers[0]?.coach}</span>
              {' · '}
              <span className="tnum font-medium text-ink">{journey.passengers[0]?.seat_number}</span>
            </span>
          )}
          <span className="tnum ml-auto font-medium text-ink">{rupees(journey.total_fare)}</span>
        </div>

        {journey.status === 'cancelled' && (
          <p className="mt-3 text-sm text-ink-faint">
            Cancelled{journey.cancellation_reason ? ` — ${journey.cancellation_reason}` : ''}. Refund of{' '}
            {rupees(journey.total_fare)} is on its way.
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-2 border-t border-rule bg-canvas-sunk p-4">
        {upcoming && (
          <Button size="sm" onClick={() => navigate(`/track?journey=${journey.id}`)} icon={<MapPin className="h-4 w-4" />}>
            {t('success.trackJourney')}
          </Button>
        )}
        <Button size="sm" variant="secondary" onClick={() => void share()} icon={<Share2 className="h-4 w-4" />}>
          {t('success.share')}
        </Button>
        {!upcoming && journey.status !== 'cancelled' && (
          <Button size="sm" variant="secondary" onClick={rebook} icon={<Repeat className="h-4 w-4" />}>
            {t('trips.rebook')}
          </Button>
        )}
        {upcoming && (
          <Button size="sm" variant="ghost" onClick={onCancel} icon={<X className="h-4 w-4" />}>
            {t('trips.cancel')}
          </Button>
        )}
      </div>
    </article>
  );
}

/**
 * Cancellation is the clearest confirmation in the app: it states exactly who
 * is affected, how much comes back, and when. Autonomy proportional to
 * consequence (master prompt §7).
 */
function CancelModal({
  journey,
  onClose,
  onDone,
}: {
  journey: Journey | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const cancelJourney = useSession((s) => s.cancelJourney);
  const notify = useSession((s) => s.notify);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    if (!journey) return;
    setBusy(true);
    try {
      await cancelJourney(journey.id, reason || 'Cancelled by passenger');
      await notify({
        priority: 'important',
        type: 'cancelled',
        title: 'Journey cancelled',
        body: `${journey.train_number} on ${journey.journey_date}. Refund of ${rupees(journey.total_fare)} started.`,
        journey_id: journey.id,
      });
      onDone();
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={Boolean(journey)}
      onClose={onClose}
      title={t('trips.cancelTitle')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('trips.keepIt')}
          </Button>
          <Button variant="danger" loading={busy} onClick={() => void confirm()}>
            {t('trips.cancelConfirm')}
          </Button>
        </>
      }
    >
      {journey && (
        <div className="space-y-4">
          <p className="text-[0.9375rem] leading-relaxed">
            {t('trips.cancelBody', {
              count: journey.passengers.length,
              amount: Math.round(journey.total_fare).toLocaleString('en-IN'),
            })}
          </p>
          <ul className="card-sunk divide-y divide-rule">
            {journey.passengers.map((p) => (
              <li key={p.person_id} className="px-4 py-3 text-sm">
                {p.name}
              </li>
            ))}
          </ul>
          <Input
            label={t('trips.reason')}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Plans changed"
          />
        </div>
      )}
    </Modal>
  );
}
