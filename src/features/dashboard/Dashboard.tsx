import { useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Building2,
  Check,
  Copy,
  Filter,
  Gift,
  MoreVertical,
  Percent,
  Plane,
  Share2,
  Sparkles,
  TrendingUp,
  Zap,
} from 'lucide-react';
import type { Train, TravelClass } from '@/types';
import { OFFERS } from '@/data/catalog';
import { getTrain } from '@/data/trains';
import { getStation } from '@/data/stations';
import { rankTrains } from '@/engine/search';
import { useSession } from '@/store/session';
import { useBooking } from '@/store/booking';
import { useLiveTrain } from '@/hooks/useLiveTrain';
import { useLocalized } from '@/hooks/useLocalized';
import { formatDate, relativeDay, timeOfDay, todayISO } from '@/lib/format';
import { Photo } from '@/components/art/Photo';
import { LiveStatusCard } from '@/components/LiveStatusCard';
import { SearchCard, defaultSearch, type SearchValues } from '@/features/trains/SearchCard';
import { TrainRow } from '@/features/trains/TrainRow';
import { Badge, Button, Chip, IconTile, SectionHeading, useToast, cx } from '@/components/ui';
import { QuickActions } from './QuickActions';
import { Recommended } from './Recommended';

type Sort = 'best' | 'fastest' | 'cheapest';

const OFFER_ICON = { percent: Percent, plane: Plane, building: Building2, bus: TrendingUp, gift: Gift };

/**
 * Home (addendum §3). Everything on this screen is live against the data
 * layer: the search card drives the real ranking engine, the next-journey and
 * live-status cards read the user's actual bookings, and the wallet figure in
 * the header moves with them.
 */
export function Dashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const toast = useToast();
  const { L } = useLocalized();

  const user = useSession((s) => s.user);
  const journeys = useSession((s) => s.journeys);
  const saveSearch = useSession((s) => s.saveSearch);
  const startBooking = useBooking((s) => s.start);

  const [search, setSearch] = useState<SearchValues>(defaultSearch);
  const [sort, setSort] = useState<Sort>('best');
  const [shown, setShown] = useState(3);
  const [copied, setCopied] = useState<string | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const greeting = t(
    { morning: 'ui.goodMorning', afternoon: 'ui.goodAfternoon', evening: 'ui.goodEvening' }[
      timeOfDay()
    ],
  );
  const firstName = (user?.name ?? 'Traveller').split(' ')[0];

  /* ---------------------------------------------- next journey + live status */

  const nextJourney = useMemo(
    () =>
      [...journeys]
        .filter((j) => j.status !== 'cancelled' && j.journey_date >= todayISO())
        .sort((a, b) => a.journey_date.localeCompare(b.journey_date))[0],
    [journeys],
  );

  const liveTrain = nextJourney ? getTrain(nextJourney.train_id) : getTrain('12608');
  const live = useLiveTrain(liveTrain, nextJourney?.journey_date ?? todayISO());

  /* --------------------------------------------------------------- results */

  const results = useMemo(() => {
    const rows = rankTrains(
      {
        from: search.from,
        to: search.to,
        date: search.date,
        quota: search.quota,
        passengers: search.passengers,
      },
      user?.preferences,
    );
    const seen = new Set<string>();
    const unique = rows.filter((r) => {
      if (seen.has(r.train.id)) return false;
      seen.add(r.train.id);
      return true;
    });
    if (sort === 'fastest') {
      return [...unique].sort((a, b) => a.train.duration_minutes - b.train.duration_minutes);
    }
    if (sort === 'cheapest') return [...unique].sort((a, b) => a.price - b.price);
    return unique;
  }, [search, sort, user?.preferences]);

  function onSelectTrain(train: Train, cls: TravelClass) {
    startBooking({
      from: search.from,
      to: search.to,
      date: search.date,
      quota: search.quota,
      passengers: search.passengers,
      travel_class: cls,
    }, train, cls);
    navigate('/trains/passengers');
  }

  function runSearch(v: SearchValues) {
    void saveSearch({ from: v.from, to: v.to, date: v.date, class: v.travel_class });
    navigate(
      `/trains?from=${v.from}&to=${v.to}&date=${v.date}&class=${v.travel_class}&quota=${encodeURIComponent(v.quota)}&pax=${v.passengers}`,
    );
  }

  const fromName = L(getStation(search.from)?.city) || search.from;
  const toName = L(getStation(search.to)?.city) || search.to;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
      {/* ------------------------------------------------------ main column */}
      <div className="min-w-0 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-[1.5rem] font-extrabold tracking-tight text-ink">
            {greeting}, {firstName}! <span aria-hidden="true">👋</span>
          </h1>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/assistant"
              className="lift shine flex items-center gap-2.5 rounded-card border border-saffron-200 bg-saffron-50 px-4 py-2.5"
            >
              <Sparkles className="h-4 w-4 shrink-0 text-saffron-500" aria-hidden="true" />
              <span className="leading-none">
                <span className="block text-[0.8125rem] font-bold text-saffron-700">{t('sidebar.assistant')}</span>
                <span className="mt-1 block text-[0.6875rem] text-saffron-600">{t('ui.planWithAi')}</span>
              </span>
            </Link>
            <Link
              to="/tatkal"
              className="lift shine flex items-center gap-2.5 rounded-card border border-confirmed/25 bg-confirmed-soft px-4 py-2.5"
            >
              <Zap className="h-4 w-4 shrink-0 text-confirmed" aria-hidden="true" />
              <span className="leading-none">
                <span className="block text-[0.8125rem] font-bold text-confirmed-ink">TATKAL</span>
                <span className="mt-1 block text-[0.6875rem] text-confirmed">{t('ui.bookInAFlash')}</span>
              </span>
            </Link>
          </div>
        </div>

        <div ref={searchRef}>
          <SearchCard value={search} onChange={setSearch} onSubmit={runSearch} />
        </div>

        <section>
          <SectionHeading>{t('ui.quickActions')}</SectionHeading>
          <QuickActions />
        </section>

        <section>
          <SectionHeading
            action={
              <Link to="/explore" className="text-[0.8125rem] font-bold text-navy-600 hover:text-navy-700">
                {t('ui.viewAll')}
              </Link>
            }
          >
            {t('ui.recommended')}
          </SectionHeading>
          <Recommended
            onPick={(r) => {
              setSearch((s) => ({ ...s, from: r.from, to: r.to }));
              searchRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              toast(`Search set to ${r.route}`);
            }}
          />
        </section>

        <section>
          <SectionHeading
            action={
              <div className="flex flex-wrap items-center gap-1.5">
                <Chip active={sort === 'best'} onClick={() => setSort('best')}>
                  🏆 {t('ui.bestOverall')}
                </Chip>
                <Chip active={sort === 'fastest'} onClick={() => setSort('fastest')}>
                  ⚡ {t('ui.fastest')}
                </Chip>
                <Chip active={sort === 'cheapest'} onClick={() => setSort('cheapest')}>
                  ⏱ {t('ui.cheapest')}
                </Chip>
                <Chip onClick={() => runSearch(search)} icon={<Filter className="h-3.5 w-3.5" />}>
                  {t('ui.filter')}
                </Chip>
              </div>
            }
          >
            {t('ui.bestOverall')} · {fromName} → {toName}{' '}
            <span className="font-medium text-ink-muted">({relativeDay(search.date)})</span>
          </SectionHeading>

          {results.length === 0 ? (
            <div className="card p-8 text-center">
              <p className="text-[0.9375rem] font-semibold text-ink">
                No direct trains on this route for {formatDate(search.date)}.
              </p>
              <p className="mt-2 text-[0.875rem] text-ink-muted">
                Try another date, or ask the Assistant to find a way through.
              </p>
              <Button className="mt-4" onClick={() => navigate('/assistant')}>
                Ask the Assistant
              </Button>
            </div>
          ) : (
            <>
              <div className="stagger space-y-3">
                {results.slice(0, shown).map((r, i) => (
                  <TrainRow
                    key={r.train.id}
                    train={r.train}
                    date={search.date}
                    badge={i === 0 && sort === 'best' ? 'Best Overall' : undefined}
                    onSelect={onSelectTrain}
                  />
                ))}
              </div>
              {shown < results.length && (
                <Button
                  variant="secondary"
                  full
                  className="mt-3"
                  onClick={() => setShown((n) => n + 3)}
                >
                  {t('ui.showMoreTrains')}
                </Button>
              )}
            </>
          )}
        </section>
      </div>

      {/* --------------------------------------------------- right sidebar */}
      <aside className="min-w-0 space-y-5">
        {/* next journey */}
        <section>
          <SectionHeading
            action={
              <Link to="/trips" className="text-[0.8125rem] font-bold text-navy-600 hover:text-navy-700">
                {t('ui.viewAll')}
              </Link>
            }
          >
            {t('ui.nextJourney')}
          </SectionHeading>

          {nextJourney ? (
            <div className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-[0.9375rem] font-bold text-ink">
                    {L(nextJourney.train_name)}{' '}
                    <span className="tnum font-semibold text-ink-muted">({nextJourney.train_number})</span>
                  </p>
                  <p className="mt-1 truncate text-[0.8125rem] text-ink-muted">
                    {L(getStation(nextJourney.from_station)?.name)} →{' '}
                    {L(getStation(nextJourney.to_station)?.name)}
                  </p>
                </div>
                <Badge tone={nextJourney.status === 'confirmed' ? 'confirmed' : 'attention'}>
                  {nextJourney.status}
                </Badge>
              </div>

              <p className="tnum mt-2 text-[0.8125rem] font-semibold text-ink">
                {formatDate(nextJourney.journey_date)} · {nextJourney.departure_time}
              </p>

              <dl className="mt-4 grid grid-cols-4 gap-px overflow-hidden rounded-lg border border-line bg-line">
                {[
                  ['Coach', nextJourney.passengers[0]?.coach ?? '—'],
                  ['Seat', nextJourney.passengers[0]?.seat_number ?? '—'],
                  ['Class', nextJourney.class],
                  ['PNR', nextJourney.pnr.slice(0, 6)],
                ].map(([k, v]) => (
                  <div key={k} className="bg-surface px-1.5 py-2 text-center">
                    <dt className="text-[0.5625rem] font-bold uppercase text-ink-faint">{k}</dt>
                    <dd className="tnum mt-0.5 truncate text-[0.75rem] font-bold text-ink">{v}</dd>
                  </div>
                ))}
              </dl>

              <div className="mt-3 flex gap-2">
                <Button size="sm" className="flex-1" onClick={() => navigate('/trips')}>
                  {t('trips.viewTicket', 'View Ticket')}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  icon={<Share2 className="h-3.5 w-3.5" />}
                  onClick={() => {
                    void navigator.clipboard
                      ?.writeText(`PNR ${nextJourney.pnr} · ${nextJourney.train_number}`)
                      .then(() => toast('Journey details copied'))
                      .catch(() => toast('Could not copy'));
                  }}
                >
                  Share
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  aria-label="More options"
                  onClick={() => navigate('/trips')}
                >
                  <MoreVertical className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="card p-5 text-center">
              <p className="text-[0.875rem] font-semibold text-ink">No upcoming journey</p>
              <p className="mt-1.5 text-[0.8125rem] text-ink-muted">
                Search above, or let the Assistant plan one for you.
              </p>
            </div>
          )}
        </section>

        {/* live status */}
        {live && (
          <section>
            <SectionHeading
              action={
                <Link
                  to="/live-status"
                  className="text-[0.8125rem] font-bold text-navy-600 hover:text-navy-700"
                >
                  View all
                </Link>
              }
            >
              {t('ui.liveTrainStatus')}
            </SectionHeading>
            <div className="card p-4">
              <LiveStatusCard live={live} compact />
            </div>
          </section>
        )}

        {/* tourism promo */}
        <Link to="/packages" className="lift relative block h-44 overflow-hidden rounded-card">
          <Photo
            src="/images/tourism.jpg"
            scene="hills"
            alt="IRCTC Tourism"
            className="absolute inset-0"
          />
          <span className="relative flex h-full flex-col justify-end p-4">
            <span className="text-[0.6875rem] font-bold uppercase tracking-wide text-white/80">
              IRCTC Tourism
            </span>
            <span className="mt-1 text-[1rem] font-bold leading-tight text-white">
              Explore Incredible India
            </span>
            <span className="mt-1 text-[0.75rem] text-white/85">
              Luxury stays · Scenic routes · Curated experiences
            </span>
            <span className="mt-3 self-start rounded-lg bg-white px-3 py-1.5 text-[0.75rem] font-bold text-navy-700">
              {t('ui.exploreNow')}
            </span>
          </span>
        </Link>

        {/* offers */}
        <section>
          <SectionHeading
            action={
              <Link to="/offers" className="text-[0.8125rem] font-bold text-navy-600 hover:text-navy-700">
                {t('ui.viewAll')}
              </Link>
            }
          >
            {t('ui.offersForYou')}
          </SectionHeading>
          <ul className="card divide-y divide-line">
            {OFFERS.slice(0, 3).map((o) => {
              const Icon = OFFER_ICON[o.icon] ?? Percent;
              return (
                <li key={o.id} className="flex items-start gap-3 p-3.5">
                  <IconTile icon={<Icon className="h-4 w-4" />} tone="saffron" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[0.8125rem] font-bold text-ink">{o.title}</p>
                    <p className="mt-0.5 text-[0.75rem] text-ink-muted">{o.applies_to}</p>
                    <button
                      type="button"
                      onClick={() => {
                        void navigator.clipboard?.writeText(o.code).catch(() => undefined);
                        setCopied(o.code);
                        toast(`Code ${o.code} copied`);
                        setTimeout(() => setCopied(null), 1600);
                      }}
                      className={cx(
                        'mt-2 inline-flex items-center gap-1.5 rounded-md border border-dashed px-2 py-1',
                        'text-[0.6875rem] font-bold transition-colors',
                        copied === o.code
                          ? 'border-confirmed bg-confirmed-soft text-confirmed-ink'
                          : 'border-line-strong text-ink-muted hover:border-navy-400 hover:text-navy-700',
                      )}
                    >
                      {copied === o.code ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                      {t('ui.useCode')}: {o.code}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <p className="tnum px-1 text-center text-[0.6875rem] text-ink-faint">
          Wallet, bookings and preferences all persist to your account.
        </p>
      </aside>
    </div>
  );
}
