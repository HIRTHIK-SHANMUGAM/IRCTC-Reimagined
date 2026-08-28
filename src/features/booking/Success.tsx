import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Check, MapPin, Share2, Ticket } from 'lucide-react';
import { useSession } from '@/store/session';
import { useBooking } from '@/store/booking';
import { useLocalized } from '@/hooks/useLocalized';
import { usePrefersReducedMotion } from '@/hooks/useReducedMotion';
import { Badge, Button, SectionHeading, StatusDot, Toast } from '@/components/ui';
import { getStation } from '@/data/stations';
import { formatDateLong, rupees } from '@/lib/format';

export function Success() {
  const { t } = useTranslation();
  const { L } = useLocalized();
  const navigate = useNavigate();
  const { journeyId } = useParams();
  const journeys = useSession((s) => s.journeys);
  const reset = useBooking((s) => s.reset);
  const reduced = usePrefersReducedMotion();
  const [toast, setToast] = useState<string | null>(null);

  const journey = journeys.find((j) => j.id === journeyId);

  useEffect(() => {
    // The draft has become a Journey; clear it so a back-navigation cannot
    // re-run the payment machine.
    reset();
  }, [reset]);

  if (!journey) {
    return (
      <div className="mx-auto max-w-lg py-12 text-center">
        <p className="text-ink-muted">That journey could not be found.</p>
        <Button className="mt-6" onClick={() => navigate('/trips')}>
          {t('trips.title')}
        </Button>
      </div>
    );
  }

  const tone =
    journey.status === 'confirmed' ? 'confirmed' : journey.status === 'RAC' ? 'attention' : 'critical';

  /** Privacy-safe share card — no Aadhaar, no seat, no full passenger list. */
  const share = async () => {
    const text =
      `${L(journey.train_name)} (${journey.train_number})\n` +
      `${L(getStation(journey.from_station)?.name)} → ${L(getStation(journey.to_station)?.name)}\n` +
      `${formatDateLong(journey.journey_date)} · departs ${journey.departure_time}`;
    try {
      if (navigator.share) await navigator.share({ title: 'My journey', text });
      else await navigator.clipboard.writeText(text);
      setToast(t('success.shareCopied'));
    } catch {
      /* the user dismissed the sheet */
    }
  };

  return (
    <div className="mx-auto max-w-lg space-y-8 py-4">
      <header className="text-center">
        <motion.span
          className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-confirmed text-white"
          initial={reduced ? undefined : { scale: 0.6, opacity: 0 }}
          animate={reduced ? undefined : { scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 320, damping: 18 }}
        >
          <Check className="h-8 w-8" aria-hidden="true" />
        </motion.span>
        <h1 className="mt-5 font-display text-4xl leading-tight">{t('success.title')}</h1>
        <p className="mt-2 text-[0.9375rem] text-ink-muted">
          {formatDateLong(journey.journey_date)}
        </p>
      </header>

      {/* ---- the ticket ---- */}
      <section className="card overflow-hidden">
        <div className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="truncate font-display text-2xl leading-tight">{L(journey.train_name)}</h2>
              <p className="label mt-1.5">
                {journey.train_number} · {t(`classes.${journey.class}`)} · {journey.quota}
              </p>
            </div>
            <Badge tone={tone}>
              <StatusDot tone={tone} />
              {t(`status.${journey.status}`)}
            </Badge>
          </div>

          <div className="mt-5 flex items-center justify-between gap-4">
            <div>
              <div className="tnum text-2xl font-semibold leading-none">{journey.departure_time}</div>
              <div className="label mt-1.5">{L(getStation(journey.from_station)?.name)}</div>
            </div>
            <div className="text-right">
              <div className="tnum text-2xl font-semibold leading-none">{journey.arrival_time}</div>
              <div className="label mt-1.5">{L(getStation(journey.to_station)?.name)}</div>
            </div>
          </div>
        </div>

        {/* Perforation — the one skeuomorphic touch, and it earns its place. */}
        <div className="relative border-t border-dashed border-rule-strong">
          <span className="absolute -left-2.5 -top-2.5 block h-5 w-5 rounded-full bg-canvas" />
          <span className="absolute -right-2.5 -top-2.5 block h-5 w-5 rounded-full bg-canvas" />
        </div>

        <ul className="divide-y divide-rule">
          {journey.passengers.map((p) => (
            <li key={p.person_id} className="flex items-center gap-4 p-5">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{p.name}</span>
                <span className="label mt-0.5 block">
                  {p.age} · {p.gender}
                </span>
              </span>
              <span className="shrink-0 text-right">
                <span className="label block">
                  {t('success.coach')} {p.coach}
                </span>
                <span className="tnum mt-1 block text-lg font-semibold">{p.seat_number}</span>
                <span className="label mt-0.5 block">{p.berth_type}</span>
              </span>
            </li>
          ))}
        </ul>

        <div className="flex items-center justify-between border-t border-rule bg-canvas-sunk px-5 py-4">
          <span className="label">{t('booking.total')}</span>
          <span className="tnum text-lg font-semibold">{rupees(journey.total_fare)}</span>
        </div>
      </section>

      <section>
        <SectionHeading>{t('home.quickAccess')}</SectionHeading>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            full
            onClick={() => navigate(`/track?journey=${journey.id}`)}
            icon={<MapPin className="h-4 w-4" />}
          >
            {t('success.trackJourney')}
          </Button>
          <Button full variant="secondary" onClick={() => void share()} icon={<Share2 className="h-4 w-4" />}>
            {t('success.share')}
          </Button>
          <Button full variant="secondary" onClick={() => navigate('/trips')} icon={<Ticket className="h-4 w-4" />}>
            {t('trips.title')}
          </Button>
        </div>
        <p className="mt-3 text-sm text-ink-faint">
          Sharing sends the train, route and time only — never a passenger&apos;s details.
        </p>
      </section>

      <Toast message={toast} onDone={() => setToast(null)} />
    </div>
  );
}
