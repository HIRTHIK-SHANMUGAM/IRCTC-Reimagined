import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Clock,
  Compass,
  MapPin,
  Repeat,
  Sparkles,
  Ticket,
  TriangleAlert,
} from 'lucide-react';
import { useSession, upcomingJourneys } from '@/store/session';
import { useBooking } from '@/store/booking';
import { useLocalized } from '@/hooks/useLocalized';
import { Badge, Button, Chip, SectionHeading, StatusDot, cx } from '@/components/ui';
import { RouteRail } from '@/components/motion/Microinteractions';
import { getStation } from '@/data/stations';
import { formatDate, relativeDay, timeOfDay, todayISO } from '@/lib/format';
import { addDays } from '@/engine/search';

/**
 * Home is a feed, not a form. Greeting, the one journey that matters next,
 * what you were doing last time, and a single conversational entry point.
 */
export function Home() {
  const { t } = useTranslation();
  const { L } = useLocalized();
  const navigate = useNavigate();
  const user = useSession((s) => s.user);
  const journeys = useSession((s) => s.journeys);
  const saved = useSession((s) => s.saved);
  const notifications = useSession((s) => s.notifications);
  const setQuery = useBooking((s) => s.setQuery);

  const next = useMemo(() => upcomingJourneys(journeys)[0], [journeys]);
  const greetingKey =
    timeOfDay() === 'morning' ? 'goodMorning' : timeOfDay() === 'afternoon' ? 'goodAfternoon' : 'goodEvening';

  // "A quiet heads-up" — only what is actually actionable, never a feed of noise.
  const headsUp = notifications.find((n) => !n.read && (n.priority === 'critical' || n.priority === 'important'));

  // Routes the user actually repeats, derived from history rather than guessed.
  const usualRoutes = useMemo(() => {
    const counts = new Map<string, { from: string; to: string; n: number }>();
    for (const j of journeys) {
      const key = `${j.from_station}-${j.to_station}`;
      const prev = counts.get(key);
      counts.set(key, { from: j.from_station, to: j.to_station, n: (prev?.n ?? 0) + 1 });
    }
    for (const s of saved) {
      const key = `${s.from}-${s.to}`;
      const prev = counts.get(key);
      counts.set(key, { from: s.from, to: s.to, n: (prev?.n ?? 0) + 1 });
    }
    return [...counts.values()].sort((a, b) => b.n - a.n).slice(0, 4);
  }, [journeys, saved]);

  const openSearch = (from: string, to: string, date?: string) => {
    setQuery({
      from,
      to,
      date: date ?? addDays(todayISO(), 1),
      quota: 'General',
      passengers: 1,
      travel_class: user?.preferences.personalization_enabled ? user.preferences.preferred_class : undefined,
    });
    navigate('/search');
  };

  return (
    <div className="space-y-10">
      {/* ---------------- greeting + ask ---------------- */}
      <section>
        <motion.h1
          className="font-display text-4xl leading-tight sm:text-5xl"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          {t(`home.${greetingKey}`, { name: user?.name?.split(' ')[0] ?? '' })}
        </motion.h1>

        <button
          type="button"
          onClick={() => navigate('/book')}
          className="mt-6 flex w-full items-center gap-4 rounded-finish border border-teal-800 bg-teal-700 p-5 text-left text-canvas transition-colors hover:bg-teal-600"
        >
          <Sparkles className="h-5 w-5 shrink-0" aria-hidden="true" />
          <span className="min-w-0 flex-1">
            <span className="block font-medium">{t('home.askTitle')}</span>
            <span className="mt-0.5 block truncate text-sm text-teal-100">
              {t('home.askPlaceholder')}
            </span>
          </span>
          <ArrowRight className="h-5 w-5 shrink-0" aria-hidden="true" />
        </button>
      </section>

      {/* ---------------- a quiet heads-up ---------------- */}
      {headsUp && (
        <section>
          <SectionHeading>{t('home.quietHeadsUp')}</SectionHeading>
          <div
            className={cx(
              'flex gap-3 rounded-card border p-4',
              headsUp.priority === 'critical'
                ? 'border-critical/25 bg-critical-soft'
                : 'border-attention/25 bg-attention-soft',
            )}
          >
            <TriangleAlert
              className={cx(
                'mt-0.5 h-4 w-4 shrink-0',
                headsUp.priority === 'critical' ? 'text-critical' : 'text-attention',
              )}
              aria-hidden="true"
            />
            <div className="min-w-0">
              <p className="font-medium">{headsUp.title}</p>
              <p className="mt-1 text-sm leading-snug text-ink-muted">{headsUp.body}</p>
            </div>
          </div>
        </section>
      )}

      {/* ---------------- next journey ---------------- */}
      <section>
        <SectionHeading
          action={
            journeys.length > 0 ? (
              <button
                type="button"
                onClick={() => navigate('/trips')}
                className="label-ink transition-colors hover:text-ink"
              >
                {t('home.seeAllTrips')}
              </button>
            ) : undefined
          }
        >
          {t('home.nextJourney')}
        </SectionHeading>

        {next ? (
          <article className="card overflow-hidden">
            <div className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="truncate font-display text-2xl leading-tight">{L(next.train_name)}</h3>
                  <p className="label mt-1.5">
                    {next.train_number} · {t(`classes.${next.class}`)}
                  </p>
                </div>
                <Badge tone={next.status === 'confirmed' ? 'confirmed' : 'attention'}>
                  <StatusDot tone={next.status === 'confirmed' ? 'confirmed' : 'attention'} />
                  {t(`status.${next.status}`)}
                </Badge>
              </div>

              <div className="mt-5 flex items-center gap-4">
                <div>
                  <div className="tnum text-2xl font-semibold leading-none">{next.departure_time}</div>
                  <div className="label mt-1.5">{getStation(next.from_station)?.code}</div>
                </div>
                <div className="min-w-0 flex-1 pt-1">
                  <RouteRail
                    progress={0}
                    compact
                    from={getStation(next.from_station)?.code ?? ''}
                    to={getStation(next.to_station)?.code ?? ''}
                  />
                </div>
                <div className="text-right">
                  <div className="tnum text-2xl font-semibold leading-none">{next.arrival_time}</div>
                  <div className="label mt-1.5">{getStation(next.to_station)?.code}</div>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-rule pt-4">
                <span className="flex items-center gap-1.5 text-sm text-ink-muted">
                  <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                  {relativeDay(next.journey_date)} · {formatDate(next.journey_date)}
                </span>
                {next.passengers[0]?.coach !== '—' && (
                  <span className="text-sm text-ink-muted">
                    <span className="label">{t('success.coach')}</span>{' '}
                    <span className="tnum font-medium text-ink">{next.passengers[0]?.coach}</span>
                    {' · '}
                    <span className="label">{t('success.seat')}</span>{' '}
                    <span className="tnum font-medium text-ink">{next.passengers[0]?.seat_number}</span>
                  </span>
                )}
              </div>
            </div>

            <div className="flex gap-2 border-t border-rule bg-canvas-sunk p-4">
              <Button size="sm" onClick={() => navigate(`/track?journey=${next.id}`)} icon={<MapPin className="h-4 w-4" />}>
                {t('success.trackJourney')}
              </Button>
              <Button size="sm" variant="secondary" onClick={() => navigate('/trips')}>
                {t('success.viewTrip')}
              </Button>
            </div>
          </article>
        ) : (
          <div className="card px-6 py-10 text-center">
            <Ticket className="mx-auto h-7 w-7 text-ink-faint" aria-hidden="true" />
            <h3 className="mt-4 font-display text-2xl">{t('home.noJourney')}</h3>
            <p className="mt-2 text-sm text-ink-muted">{t('home.noJourneyBody')}</p>
            <Button className="mt-6" onClick={() => navigate('/book')} icon={<Sparkles className="h-4 w-4" />}>
              {t('nav.book')}
            </Button>
          </div>
        )}
      </section>

      {/* ---------------- continue where you left off ---------------- */}
      {saved.length > 0 && (
        <section>
          <SectionHeading>{t('home.continueWhere')}</SectionHeading>
          <ul className="grid gap-3 sm:grid-cols-2">
            {saved.slice(0, 2).map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => openSearch(s.from, s.to, s.date >= todayISO() ? s.date : undefined)}
                  className="card w-full p-4 text-left transition-colors hover:border-rule-strong"
                >
                  <div className="flex items-center gap-2">
                    <span className="tnum font-medium">{getStation(s.from)?.code}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-ink-faint" aria-hidden="true" />
                    <span className="tnum font-medium">{getStation(s.to)?.code}</span>
                  </div>
                  <p className="mt-2 text-sm text-ink-muted">
                    {L(getStation(s.from)?.city)} → {L(getStation(s.to)?.city)}
                  </p>
                  <p className="label mt-2">
                    {s.date >= todayISO() ? formatDate(s.date) : t('search.tomorrow')}
                    {s.note ? ` · ${s.note}` : ''}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ---------------- usual routes ---------------- */}
      {usualRoutes.length > 0 && (
        <section>
          <SectionHeading>{t('home.usualRoutes')}</SectionHeading>
          <div className="flex flex-wrap gap-2">
            {usualRoutes.map((r) => (
              <Chip
                key={`${r.from}-${r.to}`}
                onClick={() => openSearch(r.from, r.to)}
                icon={<Repeat className="h-3.5 w-3.5" aria-hidden="true" />}
              >
                {getStation(r.from)?.code} → {getStation(r.to)?.code}
              </Chip>
            ))}
          </div>
        </section>
      )}

      {/* ---------------- quick access ---------------- */}
      <section>
        <SectionHeading>{t('home.quickAccess')}</SectionHeading>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { to: '/search', label: t('search.find'), Icon: Ticket },
            { to: '/track', label: t('track.title'), Icon: MapPin },
            { to: '/trips', label: t('trips.title'), Icon: Clock },
            { to: '/explore', label: t('explore.title'), Icon: Compass },
          ].map(({ to, label, Icon }) => (
            <button
              key={to}
              type="button"
              onClick={() => navigate(to)}
              className="card flex flex-col items-start gap-3 p-4 text-left transition-colors hover:border-rule-strong"
            >
              <Icon className="h-5 w-5 text-teal-700" aria-hidden="true" />
              <span className="text-sm font-medium leading-tight">{label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Personalisation is never silent — the user can see and switch it off. */}
      {user?.preferences.personalization_enabled && journeys.length > 0 && (
        <p className="border-t border-rule pt-6 text-sm leading-relaxed text-ink-faint">
          {t('profile.remembersBody', {
            departure: t(`common.${user.preferences.preferred_departure}`),
            class: t(`classes.${user.preferences.preferred_class}`),
          })}{' '}
          <button
            type="button"
            onClick={() => navigate('/you')}
            className="underline underline-offset-2 transition-colors hover:text-ink"
          >
            {t('profile.remembers')}
          </button>
        </p>
      )}
    </div>
  );
}
