import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Filter, Sparkles, TrainFront, Zap } from 'lucide-react';
import type { Quota, Train, TravelClass } from '@/types';
import { getStation } from '@/data/stations';
import { bucketResults, rankTrains, smartAlternatives } from '@/engine/search';
import { useSession } from '@/store/session';
import { useBooking } from '@/store/booking';
import { useLocalized } from '@/hooks/useLocalized';
import { formatDate, relativeDay, todayISO } from '@/lib/format';
import { Alert, Badge, Button, Chip, EmptyState, PageHeader, cx, useToast } from '@/components/ui';
import { SearchCard, defaultSearch, type SearchValues } from './SearchCard';
import { TrainRow } from './TrainRow';

type Sort = 'best' | 'fastest' | 'cheapest' | 'earliest';

/**
 * Trains results (master prompt golden path, restyled for the addendum). Also
 * serves Tatkal mode, which strips the form down and pre-selects the quota.
 */
export function Trains({ tatkal }: { tatkal?: boolean }) {
  const navigate = useNavigate();
  const toast = useToast();
  const { L } = useLocalized();
  const [params] = useSearchParams();

  const user = useSession((s) => s.user);
  const saveSearch = useSession((s) => s.saveSearch);
  const startBooking = useBooking((s) => s.start);

  const [search, setSearch] = useState<SearchValues>(() => ({
    ...defaultSearch(),
    from: params.get('from') ?? 'MAS',
    to: params.get('to') ?? 'SBC',
    date: params.get('date') ?? todayISO(),
    travel_class: (params.get('class') as TravelClass) ?? '3A',
    quota: tatkal ? 'Tatkal' : ((params.get('quota') as Quota) ?? 'General'),
    passengers: Number(params.get('pax')) || 1,
  }));

  const [sort, setSort] = useState<Sort>('best');
  const [shown, setShown] = useState(6);
  const [onlyBoardable, setOnlyBoardable] = useState(false);

  useEffect(() => {
    if (tatkal) setSearch((s) => ({ ...s, quota: 'Tatkal' }));
  }, [tatkal]);

  const query = useMemo(
    () => ({
      from: search.from,
      to: search.to,
      date: search.date,
      quota: search.quota,
      passengers: search.passengers,
    }),
    [search],
  );

  const results = useMemo(() => {
    const rows = rankTrains(query, user?.preferences);
    const seen = new Set<string>();
    let unique = bucketResults(rows, query).filter((r) => {
      const key = `${r.train.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    if (onlyBoardable) {
      unique = unique.filter((r) => r.availability.state === 'available' || r.availability.state === 'rac');
    }
    if (sort === 'fastest') {
      return [...unique].sort((a, b) => a.train.duration_minutes - b.train.duration_minutes);
    }
    if (sort === 'cheapest') return [...unique].sort((a, b) => a.price - b.price);
    if (sort === 'earliest') {
      return [...unique].sort((a, b) => a.train.departure_time.localeCompare(b.train.departure_time));
    }
    return unique;
  }, [query, sort, onlyBoardable, user?.preferences]);

  const alternatives = useMemo(
    () => (results.length === 0 ? smartAlternatives({ ...query, travel_class: search.travel_class }) : []),
    [results.length, query, search.travel_class],
  );

  function onSelect(train: Train, cls: TravelClass) {
    startBooking({ ...query, travel_class: cls }, train, cls);
    navigate('/trains/passengers');
  }

  const fromName = L(getStation(search.from)?.city) || search.from;
  const toName = L(getStation(search.to)?.city) || search.to;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title={tatkal ? 'Tatkal booking' : 'Trains'}
        badge={tatkal ? <Badge tone="confirmed">Fewest steps</Badge> : undefined}
        subtitle={
          tatkal
            ? 'Tatkal opens at 10:00 for AC and 11:00 for non-AC, one day before travel. This form is stripped to the essentials so you are not typing when the clock starts.'
            : 'Search, compare and book — with the reason for every recommendation shown.'
        }
      />

      <SearchCard
        value={search}
        onChange={setSearch}
        tatkal={tatkal}
        onSubmit={(v) => {
          void saveSearch({ from: v.from, to: v.to, date: v.date, class: v.travel_class });
          setShown(6);
          toast(`Searching ${fromName} → ${toName}`);
        }}
      />

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <Chip active={sort === 'best'} onClick={() => setSort('best')}>
          🏆 Best Overall
        </Chip>
        <Chip active={sort === 'fastest'} onClick={() => setSort('fastest')}>
          ⚡ Fastest
        </Chip>
        <Chip active={sort === 'cheapest'} onClick={() => setSort('cheapest')}>
          ₹ Cheapest
        </Chip>
        <Chip active={sort === 'earliest'} onClick={() => setSort('earliest')}>
          Earliest
        </Chip>
        <Chip
          active={onlyBoardable}
          onClick={() => setOnlyBoardable((v) => !v)}
          icon={<Filter className="h-3.5 w-3.5" />}
        >
          Can board today
        </Chip>
        <span className="ml-auto text-[0.8125rem] text-ink-muted">
          {results.length} train{results.length === 1 ? '' : 's'} · {relativeDay(search.date)}
        </span>
      </div>

      {tatkal && (
        <Alert tone="attention" icon={<Zap className="h-4 w-4" />} className="mt-4">
          Tatkal fares carry a premium and the quota is small. If your date is flexible, General quota a
          few days earlier is almost always cheaper and calmer.
        </Alert>
      )}

      {results.length === 0 ? (
        <div className="mt-5 space-y-4">
          <EmptyState
            icon={<TrainFront className="h-5 w-5" />}
            title={`No trains from ${fromName} to ${toName} on ${formatDate(search.date)}`}
            body="Here is what would work instead."
          />
          {alternatives.length > 0 && (
            <ul className="space-y-2">
              {alternatives.map((a) => (
                <li key={a.label}>
                  <button
                    type="button"
                    onClick={() => setSearch((s) => ({ ...s, ...a.query } as SearchValues))}
                    className="lift card flex w-full items-center justify-between gap-3 p-4 text-left"
                  >
                    <span className="min-w-0">
                      <span className="block text-[0.9375rem] font-bold text-ink">{a.label}</span>
                      <span className="mt-0.5 block text-[0.8125rem] text-ink-muted">{a.reason}</span>
                    </span>
                    <span className="shrink-0 text-[0.8125rem] font-bold text-navy-600">Try this →</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <Button
            variant="secondary"
            full
            icon={<Sparkles className="h-4 w-4" />}
            onClick={() => navigate('/assistant')}
          >
            Ask the Assistant to find a way through
          </Button>
        </div>
      ) : (
        <>
          <div className={cx('stagger mt-4 space-y-3')}>
            {results.slice(0, shown).map((r, i) => (
              <TrainRow
                key={r.train.id}
                train={r.train}
                date={search.date}
                badge={i === 0 && sort === 'best' ? 'Best Overall' : undefined}
                onSelect={onSelect}
              />
            ))}
          </div>
          {shown < results.length && (
            <Button variant="secondary" full className="mt-3" onClick={() => setShown((n) => n + 6)}>
              Show more trains
            </Button>
          )}
        </>
      )}
    </div>
  );
}
