import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Check, MapPin, Train as TrainIcon } from 'lucide-react';
import type { JourneyTracking } from '@/types';
import { useSession, upcomingJourneys } from '@/store/session';
import { useLocalized } from '@/hooks/useLocalized';
import { repo } from '@/lib/backend';
import { getTrain } from '@/data/trains';
import { getStation } from '@/data/stations';
import {
  Alert,
  Badge,
  Button,
  EmptyState,
  SectionHeading,
  Select,
  StatusDot,
  cx,
} from '@/components/ui';
import { DottedCountdown, RouteRail, Tachometer } from '@/components/motion/Microinteractions';
import { daysBetween, formatDate, todayISO } from '@/lib/format';

/**
 * Track / Journey Mode. The screen changes with time-to-departure: days out it
 * is a countdown, hours out it is a checklist and a platform, on the day it is
 * a live position (master prompt §8).
 */
export function Track() {
  const { t } = useTranslation();
  const { L } = useLocalized();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const journeys = useSession((s) => s.journeys);

  const upcoming = useMemo(() => upcomingJourneys(journeys), [journeys]);
  const requestedId = params.get('journey');
  const requestedTrain = params.get('train');

  const [selectedId, setSelectedId] = useState<string>(requestedId ?? upcoming[0]?.id ?? '');
  const journey = journeys.find((j) => j.id === selectedId) ?? upcoming[0];

  const [tracking, setTracking] = useState<JourneyTracking | null>(null);

  // Live simulation. In a deployed project the scheduled Cloud Function owns
  // journey_tracking; this keeps the screen alive locally between those writes.
  useEffect(() => {
    if (!journey) return;
    let cancelled = false;

    const step = async () => {
      const existing = await repo.getTracking(journey.pnr).catch(() => null);
      if (cancelled) return;

      const days = daysBetween(journey.journey_date);
      const base = existing?.progress ?? 0;
      // Only a journey happening today actually moves.
      const progress = days > 0 ? 0 : Math.min(1, base + 0.012);

      const train = getTrain(journey.train_id);
      const stops = train?.stops ?? [];
      const idx = Math.min(stops.length - 1, Math.floor(progress * (stops.length - 1)));
      const current = stops[idx];
      const next = stops[Math.min(stops.length - 1, idx + 1)];

      const updated: JourneyTracking = {
        pnr: journey.pnr,
        current_station: current?.station ?? journey.from_station,
        next_stop: next
          ? { station: next.station, arrival_time: next.arrival ?? next.departure ?? '' }
          : null,
        delay_minutes: existing?.delay_minutes ?? (Number(journey.train_number) % 3 === 0 ? 15 : 0),
        platform: current?.platform ?? 1,
        speed_kmh: progress >= 1 || days > 0 ? 0 : 62 + Math.round(Math.sin(progress * 9) * 38),
        progress,
        alerts: existing?.alerts ?? [],
        updated_at: Date.now(),
      };

      setTracking(updated);
      void repo.putTracking(updated).catch(() => undefined);
    };

    void step();
    const timer = setInterval(() => void step(), 5000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [journey]);

  if (!journey) {
    return (
      <div className="space-y-6">
        <h1 className="font-display text-4xl leading-tight">{t('track.title')}</h1>
        <EmptyState
          title={t('track.empty')}
          body={t('track.emptyBody')}
          art={<TrainIcon className="h-7 w-7 text-ink-faint" aria-hidden="true" />}
          action={<Button onClick={() => navigate('/book')}>{t('nav.book')}</Button>}
        />
        {requestedTrain && (
          <Alert tone="info">
            Train {requestedTrain} is not on any of your journeys, so there is nothing to follow yet.
            Book it and it appears here.
          </Alert>
        )}
      </div>
    );
  }

  const days = daysBetween(journey.journey_date);
  const mode: 'far' | 'soon' | 'station' | 'onboard' | 'done' =
    tracking && tracking.progress >= 1
      ? 'done'
      : days > 1
        ? 'far'
        : days === 1
          ? 'soon'
          : tracking && tracking.progress > 0.02
            ? 'onboard'
            : 'station';

  const train = getTrain(journey.train_id);
  const delay = tracking?.delay_minutes ?? 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-4xl leading-tight">{t('track.title')}</h1>
        {upcoming.length > 1 && (
          <div className="w-full max-w-xs">
            <Select value={selectedId} onChange={(e) => setSelectedId(e.target.value)} aria-label={t('track.title')}>
              {upcoming.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.train_number} · {formatDate(j.journey_date)}
                </option>
              ))}
            </Select>
          </div>
        )}
      </div>

      {/* ---- delay banner: states the consequence, not just the number ---- */}
      {delay > 0 && mode !== 'far' && (
        <Alert tone="attention" title={t('track.delayed', { minutes: delay })} icon={<AlertTriangle className="h-4 w-4" />}>
          {t('track.delayNote', { minutes: delay })}
        </Alert>
      )}

      {/* ---- the journey ---- */}
      <section className="card p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="truncate font-display text-2xl leading-tight">{L(journey.train_name)}</h2>
            <p className="label mt-1.5">
              {journey.train_number} · {t(`classes.${journey.class}`)}
            </p>
          </div>
          <Badge tone={delay > 0 ? 'attention' : 'confirmed'}>
            <StatusDot tone={delay > 0 ? 'attention' : 'confirmed'} />
            {delay > 0 ? t('track.delayed', { minutes: delay }) : t('track.onTime')}
          </Badge>
        </div>

        <div className="mt-6">
          <RouteRail
            progress={tracking?.progress ?? 0}
            from={L(getStation(journey.from_station)?.name)}
            to={L(getStation(journey.to_station)?.name)}
          />
        </div>

        {/* ---- mode-dependent centrepiece ---- */}
        <div className="mt-6 flex flex-wrap items-center gap-8 border-t border-rule pt-6">
          {mode === 'far' && (
            <DottedCountdown
              progress={Math.max(0, 1 - days / 14)}
              value={String(days)}
              label={days === 1 ? 'day to go' : 'days to go'}
            />
          )}

          {mode === 'soon' && (
            <DottedCountdown progress={0.75} value="1" label="day to go" />
          )}

          {(mode === 'station' || mode === 'onboard') && (
            <>
              <Tachometer kmh={tracking?.speed_kmh ?? 0} />
              <div>
                <p className="label">{t('track.near', { station: '' }).replace('{{station}}', '')}</p>
                <p className="mt-1 text-lg font-medium">
                  {L(getStation(tracking?.current_station ?? journey.from_station)?.name)}
                </p>
              </div>
              {tracking?.next_stop && (
                <div>
                  <p className="label">{t('track.nextStop')}</p>
                  <p className="mt-1 text-lg font-medium">
                    {L(getStation(tracking.next_stop.station)?.name)}
                  </p>
                  <p className="tnum label mt-0.5">{tracking.next_stop.arrival_time}</p>
                </div>
              )}
            </>
          )}

          {mode === 'done' && (
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-confirmed text-white">
                <Check className="h-5 w-5" aria-hidden="true" />
              </span>
              <p className="text-lg font-medium">{t('track.journeyComplete')}</p>
            </div>
          )}

          <div className="ml-auto text-right">
            <p className="label">{t('track.platform')}</p>
            <p className="tnum mt-1 text-3xl font-semibold leading-none">{tracking?.platform ?? '—'}</p>
          </div>
        </div>
      </section>

      {/* ---- before you board ---- */}
      {mode !== 'done' && (
        <section>
          <SectionHeading>{t('track.checklist')}</SectionHeading>
          <ul className="card divide-y divide-rule">
            {[
              t('track.checkTicket'),
              t('track.checkPlatform', { platform: tracking?.platform ?? 1 }),
              t('track.checkId'),
            ].map((item) => (
              <li key={item} className="flex items-center gap-3 p-4">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full border border-confirmed bg-confirmed-soft">
                  <Check className="h-3 w-3 text-confirmed-ink" aria-hidden="true" />
                </span>
                <span className="text-sm">{item}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ---- the route ---- */}
      {train && (
        <section>
          <SectionHeading>{t('track.runningStatus')}</SectionHeading>
          <ol className="card divide-y divide-rule">
            {train.stops.map((stop, i) => {
              const passed =
                (tracking?.progress ?? 0) * (train.stops.length - 1) >= i && journey.journey_date <= todayISO();
              const isCurrent = tracking?.current_station === stop.station;
              return (
                <li key={stop.station} className={cx('flex items-center gap-4 p-4', isCurrent && 'bg-teal-50')}>
                  <span
                    className={cx(
                      'grid h-3 w-3 shrink-0 place-items-center rounded-full border-2',
                      passed ? 'border-teal-700 bg-teal-700' : 'border-rule-strong bg-canvas',
                    )}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1">
                    <span className={cx('block truncate', isCurrent ? 'font-medium' : '')}>
                      {L(getStation(stop.station)?.name)}
                    </span>
                    <span className="label mt-0.5 block">
                      {stop.station} · {stop.distance_km} km
                    </span>
                  </span>
                  <span className="tnum shrink-0 text-right text-sm">
                    <span className="block">{stop.arrival ?? '—'}</span>
                    <span className="label block">
                      {t('track.platform')} {stop.platform}
                    </span>
                  </span>
                </li>
              );
            })}
          </ol>
        </section>
      )}

      <p className="flex items-center gap-2 text-sm text-ink-faint">
        <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
        Position and timings are simulated for this demo. In production they come from the scheduled
        Cloud Function that writes journey_tracking.
      </p>
    </div>
  );
}
