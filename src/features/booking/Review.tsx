import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CreditCard, Landmark, Lock, Smartphone, Wallet } from 'lucide-react';
import { useBooking, computeFare } from '@/store/booking';
import { useLocalized } from '@/hooks/useLocalized';
import { availabilityLabel } from '@/engine/availability';
import { formatDuration } from '@/engine/search';
import { getStation } from '@/data/stations';
import { Alert, Badge, Button, SectionHeading, StatusDot, cx } from '@/components/ui';
import { formatDateLong, rupees } from '@/lib/format';

const METHODS = [
  { id: 'upi', label: 'UPI', Icon: Smartphone },
  { id: 'card', label: 'Card', Icon: CreditCard },
  { id: 'netbanking', label: 'Net banking', Icon: Landmark },
  { id: 'wallet', label: 'Wallet', Icon: Wallet },
];

/**
 * Review. A checkout, not a government form: route, train, passengers and the
 * complete fare — base, fees, insurance, total — with nothing hidden (§8, §11).
 * This is the last screen before the red "execute" step.
 */
export function Review() {
  const { t } = useTranslation();
  const { L } = useLocalized();
  const navigate = useNavigate();
  const booking = useBooking();
  const { selection, query, passengers } = booking;

  if (!selection || !query || passengers.length === 0) {
    navigate('/trains');
    return null;
  }

  const fare = computeFare(selection.price, passengers.length);
  const a = availabilityLabel(selection.availability);
  const fromStop = selection.train.stops.find((s) => s.station === query.from);
  const toStop = selection.train.stops.find((s) => s.station === query.to);

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <header>
        <h1 className="font-extrabold tracking-tight text-3xl leading-tight">{t('booking.review')}</h1>
        <p className="mt-2 text-[0.9375rem] text-ink-muted">{formatDateLong(query.date)}</p>
      </header>

      {/* ---- the journey ---- */}
      <section className="card p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="truncate font-extrabold tracking-tight text-2xl leading-tight">{L(selection.train.name)}</h2>
            <p className="label mt-1.5">
              {selection.train.number} · {t(`classes.${selection.travel_class}`)} · {query.quota}
            </p>
          </div>
          <Badge tone={a.tone}>
            <StatusDot tone={a.tone} />
            {a.headline}
          </Badge>
        </div>

        <div className="mt-5 flex items-center gap-4">
          <div>
            <div className="tnum text-2xl font-semibold leading-none">
              {fromStop?.departure ?? selection.train.departure_time}
            </div>
            <div className="label mt-1.5">{L(getStation(query.from)?.name)}</div>
          </div>
          <div className="min-w-0 flex-1 text-center">
            <span className="label">{formatDuration(selection.train.duration_minutes)}</span>
            <div className="mt-1 h-px w-full bg-line-strong" />
          </div>
          <div className="text-right">
            <div className="tnum text-2xl font-semibold leading-none">
              {toStop?.arrival ?? selection.train.arrival_time}
            </div>
            <div className="label mt-1.5">{L(getStation(query.to)?.name)}</div>
          </div>
        </div>

        <p className="mt-4 border-t border-line pt-4 text-sm text-ink-muted">{a.detail}</p>
      </section>

      {/* ---- passengers ---- */}
      <section>
        <SectionHeading
          action={
            <button
              type="button"
              onClick={() => navigate('/trains/passengers')}
              className="label-ink transition-colors hover:text-ink"
            >
              {t('common.edit')}
            </button>
          }
        >
          {t('booking.who')}
        </SectionHeading>
        <ul className="card divide-y divide-line">
          {passengers.map((p) => (
            <li key={p.id} className="flex items-center gap-4 p-4">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface-sunk font-medium text-ink-muted">
                {p.name.charAt(0).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{p.name}</span>
                <span className="label mt-0.5 block">
                  {p.age} · {p.gender}
                </span>
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-ink-faint">
          Each ticket is issued in that passenger&apos;s own name, against their own Aadhaar.
        </p>
      </section>

      {/* ---- fare, in full ---- */}
      <section>
        <SectionHeading>{t('booking.fareBreakdown')}</SectionHeading>
        <dl className="card space-y-3 p-5">
          <div className="flex justify-between gap-4">
            <dt className="text-ink-muted">
              {t('booking.base')} · {rupees(selection.price)} × {passengers.length}
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
            <dt className="text-lg font-medium">{t('booking.total')}</dt>
            <dd className="tnum text-2xl font-semibold">{rupees(fare.total)}</dd>
          </div>
        </dl>
        <p className="mt-3 text-sm text-ink-faint">{t('booking.nothingHidden')}</p>
      </section>

      {/* ---- payment method ---- */}
      <section>
        <SectionHeading>{t('booking.payWith')}</SectionHeading>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {METHODS.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => booking.setPaymentMethod(id)}
              aria-pressed={booking.paymentMethod === id}
              className={cx(
                'card flex flex-col items-start gap-3 p-4 text-left transition-colors',
                booking.paymentMethod === id
                  ? 'border-navy-700 ring-1 ring-navy-700'
                  : 'hover:border-line-strong',
              )}
            >
              <Icon className="h-5 w-5 text-navy-700" aria-hidden="true" />
              <span className="text-sm font-medium">{label}</span>
            </button>
          ))}
        </div>
      </section>

      <Alert tone="info" icon={<Lock className="h-4 w-4" />}>
        Nothing is booked and nothing is charged until you press the button below.
      </Alert>

      <div className="sticky bottom-20 flex flex-col gap-2 border-t border-line bg-page pt-4 sm:flex-row-reverse lg:bottom-0">
        <Button size="lg" full onClick={() => navigate('/trains/payment')}>
          {t('booking.confirmAndPay', { amount: Math.round(fare.total).toLocaleString('en-IN') })}
        </Button>
        <Button size="lg" variant="secondary" onClick={() => navigate('/trains/passengers')}>
          {t('booking.back')}
        </Button>
      </div>
    </div>
  );
}
