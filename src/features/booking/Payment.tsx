import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { AlertTriangle, Check, Info } from 'lucide-react';
import type { Journey, PaymentState } from '@/types';
import { useBooking, allocateSeats, computeFare } from '@/store/booking';
import { useSession } from '@/store/session';
import { useLocalized } from '@/hooks/useLocalized';
import { Alert, Button, cx } from '@/components/ui';
import { generatePnr } from '@/lib/hash';
import { canBoard } from '@/engine/availability';

/**
 * The payment state machine, made visible. Never a bare spinner, and failure is
 * a first-class state with an explicit "do not pay again" (master prompt §8).
 */
const STAGES: PaymentState[] = ['initiated', 'processing', 'received', 'reserving', 'confirmed'];

const STAGE_MS: Record<string, number> = {
  initiated: 700,
  processing: 1400,
  received: 900,
  reserving: 1500,
};

export function Payment() {
  const { t } = useTranslation();
  const { L } = useLocalized();
  const navigate = useNavigate();
  const booking = useBooking();
  const addJourney = useSession((s) => s.addJourney);
  const notify = useSession((s) => s.notify);

  const [state, setState] = useState<PaymentState>('initiated');
  const [journey, setJourney] = useState<Journey | null>(null);
  const started = useRef(false);

  const { selection, query, passengers } = booking;

  useEffect(() => {
    if (!selection || !query || passengers.length === 0) {
      navigate('/book');
      return;
    }
    if (started.current) return;
    started.current = true;

    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];

    const advance = async (index: number) => {
      if (cancelled) return;
      const stage = STAGES[index];
      setState(stage);
      booking.setPaymentState(stage);

      if (stage === 'confirmed') {
        const fare = computeFare(selection.price, passengers.length);
        const status = canBoard(selection.availability)
          ? selection.availability.state === 'rac'
            ? ('RAC' as const)
            : ('confirmed' as const)
          : ('waitlist' as const);

        const fromStop = selection.train.stops.find((s) => s.station === query.from);
        const toStop = selection.train.stops.find((s) => s.station === query.to);
        const pnr = generatePnr();

        const created = await addJourney({
          pnr,
          train_id: selection.train.id,
          train_number: selection.train.number,
          train_name: selection.train.name,
          from_station: query.from,
          to_station: query.to,
          journey_date: query.date,
          departure_time: fromStop?.departure ?? selection.train.departure_time,
          arrival_time: toStop?.arrival ?? selection.train.arrival_time,
          duration_minutes: selection.train.duration_minutes,
          class: selection.travel_class,
          quota: query.quota,
          passengers: allocateSeats(passengers, selection.travel_class, booking.berth, status, pnr),
          total_fare: fare.total,
          fare_breakdown: fare,
          status,
          booking_time: Date.now(),
          payment_method: booking.paymentMethod,
          payment_state: 'confirmed',
          boarding_station: query.from,
        });

        if (cancelled) return;
        setJourney(created);

        await notify({
          priority: 'useful',
          type: 'chart_prepared',
          title: 'Journey confirmed',
          body: `${selection.train.number} ${selection.train.name.en} on ${query.date}. We will tell you about platform and timing changes.`,
          journey_id: created.id,
        });

        timers.push(setTimeout(() => !cancelled && navigate(`/book/success/${created.id}`), 900));
        return;
      }

      timers.push(setTimeout(() => void advance(index + 1), STAGE_MS[stage] ?? 900));
    };

    void advance(0);

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
    // Deliberately runs once — the machine owns its own progression.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!selection || !query) return null;

  const currentIndex = STAGES.indexOf(state);
  const failed = state === 'failed';

  return (
    <div className="mx-auto max-w-lg py-8">
      <h1 className="font-display text-3xl leading-tight">{L(selection.train.name)}</h1>
      <p className="label mt-2">
        {selection.train.number} · {t(`classes.${selection.travel_class}`)}
      </p>

      <ol className="mt-10 space-y-1" aria-live="polite">
        {STAGES.map((stage, i) => {
          const done = i < currentIndex || state === 'confirmed';
          const active = i === currentIndex && state !== 'confirmed';
          const pending = i > currentIndex;

          return (
            <li key={stage} className="flex gap-4">
              {/* The connector line makes this read as a sequence, not a list. */}
              <div className="flex flex-col items-center">
                <span
                  className={cx(
                    'grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 transition-colors duration-300',
                    done
                      ? 'border-confirmed bg-confirmed text-white'
                      : active
                        ? 'border-teal-700 bg-canvas'
                        : 'border-rule-strong bg-canvas',
                  )}
                >
                  {done ? (
                    <Check className="h-4 w-4" aria-hidden="true" />
                  ) : active ? (
                    <motion.span
                      className="block h-2.5 w-2.5 rounded-full bg-teal-700"
                      animate={{ scale: [1, 0.6, 1], opacity: [1, 0.5, 1] }}
                      transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
                    />
                  ) : (
                    <span className="block h-2 w-2 rounded-full bg-rule-strong" />
                  )}
                </span>
                {i < STAGES.length - 1 && (
                  <span
                    className={cx(
                      'my-1 w-[2px] flex-1 rounded-full transition-colors duration-300',
                      done ? 'bg-confirmed' : 'bg-rule',
                    )}
                    style={{ minHeight: '1.75rem' }}
                  />
                )}
              </div>

              <div className="pb-6">
                <p
                  className={cx(
                    'text-[0.9375rem] transition-colors',
                    pending ? 'text-ink-faint' : 'font-medium text-ink',
                  )}
                >
                  {t(`payment.${stage}`)}
                </p>
                {active && stage === 'reserving' && (
                  <p className="mt-1 text-sm text-ink-muted">
                    Holding your seats with the reservation system.
                  </p>
                )}
                {active && stage === 'received' && (
                  <p className="mt-1 text-sm text-ink-muted">{t('payment.dontPayAgain')}</p>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {failed && (
        <div className="space-y-4">
          <Alert tone="critical" title={t('payment.failed')} icon={<AlertTriangle className="h-4 w-4" />}>
            {t('payment.failedBody')}
          </Alert>
          <Button full onClick={() => navigate('/book/review')}>
            {t('payment.tryAgain')}
          </Button>
        </div>
      )}

      {state === 'confirmed' && journey && (
        <Alert tone="confirmed" icon={<Check className="h-4 w-4" />}>
          {t('success.title')} — taking you to your ticket.
        </Alert>
      )}

      {!failed && state !== 'confirmed' && (
        <Alert tone="info" icon={<Info className="h-4 w-4" />}>
          Keep this page open. If anything goes wrong we will tell you exactly what happened and what to do.
        </Alert>
      )}
    </div>
  );
}
