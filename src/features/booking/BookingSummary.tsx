import { useTranslation } from 'react-i18next';
import { useBooking, computeFare } from '@/store/booking';
import { useLocalized } from '@/hooks/useLocalized';
import { availabilityLabel } from '@/engine/availability';
import { formatDuration } from '@/engine/search';
import { getStation } from '@/data/stations';
import { Badge, StatusDot } from '@/components/ui';
import { formatDate, rupees } from '@/lib/format';

/**
 * The persistent selected-journey column. Desktop keeps this on screen through
 * the whole checkout so the user never loses sight of what they are buying.
 */
export function BookingSummary() {
  const { t } = useTranslation();
  const { L } = useLocalized();
  const { selection, query, passengers } = useBooking();

  if (!selection || !query) return null;

  const a = availabilityLabel(selection.availability);
  const count = Math.max(passengers.length, 1);
  const fare = computeFare(selection.price, count);
  const fromStop = selection.train.stops.find((s) => s.station === query.from);
  const toStop = selection.train.stops.find((s) => s.station === query.to);

  return (
    <aside className="card sticky top-24 overflow-hidden">
      <div className="border-b border-line p-5">
        <h2 className="font-extrabold tracking-tight text-xl leading-tight">{L(selection.train.name)}</h2>
        <p className="label mt-1.5">
          {selection.train.number} · {t(`classes.${selection.travel_class}`)}
        </p>

        <div className="mt-4 flex items-center justify-between gap-3">
          <div>
            <div className="tnum text-lg font-semibold leading-none">
              {fromStop?.departure ?? selection.train.departure_time}
            </div>
            <div className="label mt-1">{getStation(query.from)?.code}</div>
          </div>
          <span className="label">{formatDuration(selection.train.duration_minutes)}</span>
          <div className="text-right">
            <div className="tnum text-lg font-semibold leading-none">
              {toStop?.arrival ?? selection.train.arrival_time}
            </div>
            <div className="label mt-1">{getStation(query.to)?.code}</div>
          </div>
        </div>

        <p className="mt-4 text-sm text-ink-muted">{formatDate(query.date)}</p>

        <div className="mt-3">
          <Badge tone={a.tone}>
            <StatusDot tone={a.tone} />
            {a.headline}
          </Badge>
        </div>
      </div>

      <dl className="space-y-2.5 p-5 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-ink-muted">
            {t('booking.base')} × {count}
          </dt>
          <dd className="tnum">{rupees(fare.base)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-ink-muted">{t('booking.convenience')}</dt>
          <dd className="tnum">{rupees(fare.convenience_fee)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-ink-muted">{t('booking.insurance')}</dt>
          <dd className="tnum">{rupees(fare.insurance)}</dd>
        </div>
        <div className="flex justify-between gap-4 border-t border-line pt-3">
          <dt className="font-medium">{t('booking.total')}</dt>
          <dd className="tnum text-lg font-semibold">{rupees(fare.total)}</dd>
        </div>
      </dl>
    </aside>
  );
}
