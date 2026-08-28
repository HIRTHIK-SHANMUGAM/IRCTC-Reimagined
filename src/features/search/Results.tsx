import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Info, Lightbulb } from 'lucide-react';
import type { Alternative, RankedTrain, SearchQuery } from '@/types';
import { bucketResults, formatDuration, rankTrains, smartAlternatives } from '@/engine/search';
import { availabilityLabel, canBoard } from '@/engine/availability';
import { useSession } from '@/store/session';
import { useBooking } from '@/store/booking';
import { repo } from '@/lib/backend';
import { SearchPanel } from './SearchPanel';
import { TrainCard } from '@/components/TrainCard';
import {
  Alert,
  Badge,
  Button,
  Chip,
  SectionHeading,
  StatusDot,
  Toast,
  cx,
} from '@/components/ui';
import { useLocalized } from '@/hooks/useLocalized';
import { getStation } from '@/data/stations';
import { rupees } from '@/lib/format';

/**
 * Results. Four buckets with a one-line Why, the full list behind a disclosure,
 * side-by-side compare, and — when nothing works — the alternatives that do.
 * The algorithm helps; it never hides an option (master prompt §10).
 */
export function Results() {
  const { t } = useTranslation();
  const { L } = useLocalized();
  const navigate = useNavigate();
  const user = useSession((s) => s.user);
  const people = useSession((s) => s.people);
  const booking = useBooking();
  const query = booking.query;

  const [showAll, setShowAll] = useState(false);
  const [compare, setCompare] = useState<RankedTrain[]>([]);
  const [watching, setWatching] = useState<string[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  const rows = useMemo(
    () => (query ? rankTrains(query, user?.preferences) : []),
    [query, user?.preferences],
  );
  const buckets = useMemo(() => bucketResults(rows, query ?? undefined), [rows, query]);
  const alternatives = useMemo(
    () => (query && rows.filter((r) => canBoard(r.availability)).length === 0 ? smartAlternatives(query) : []),
    [query, rows],
  );

  if (!query) {
    return (
      <Alert tone="info" icon={<Info className="h-4 w-4" />}>
        Start a search from Home, or ask IRCTC RI where you want to go.
      </Alert>
    );
  }

  const applyAlternative = (alt: Alternative) => {
    booking.patchQuery(alt.query as Partial<SearchQuery>);
    setShowAll(false);
  };

  const select = (row: RankedTrain) => {
    booking.select(row);
    const frequent = people.filter((p) => p.is_frequent);
    booking.setPassengers((frequent.length >= query.passengers ? frequent : people).slice(0, query.passengers));
    booking.markPrepared(false);
    navigate('/book/passengers');
  };

  const toggleCompare = (row: RankedTrain) => {
    setCompare((prev) => {
      const key = `${row.train.id}-${row.travel_class}`;
      const exists = prev.some((r) => `${r.train.id}-${r.travel_class}` === key);
      if (exists) return prev.filter((r) => `${r.train.id}-${r.travel_class}` !== key);
      return prev.length >= 3 ? prev : [...prev, row];
    });
  };

  const watch = (row: RankedTrain) => {
    const key = `${row.train.id}-${row.travel_class}`;
    setWatching((w) => (w.includes(key) ? w.filter((x) => x !== key) : [...w, key]));
    void repo
      .addWatch({ train_id: row.train.id, travel_class: row.travel_class, date: query.date })
      .then(() => setToast(`Watching ${row.train.name.en} — we will tell you if ${row.travel_class} opens up.`))
      .catch(() => undefined);
  };

  return (
    <div className="space-y-8">
      <div className="lg:grid lg:grid-cols-[22rem_1fr] lg:items-start lg:gap-8">
        {/* Desktop: search stays on the left, results scroll beside it. */}
        <div className="lg:sticky lg:top-24">
          <SearchPanel
            query={query}
            onChange={(patch) => booking.patchQuery(patch)}
            onSubmit={() => setShowAll(false)}
          />
        </div>

        <div className="mt-8 space-y-8 lg:mt-0">
          <header>
            <h1 className="font-display text-3xl leading-tight">
              {L(getStation(query.from)?.city)} → {L(getStation(query.to)?.city)}
            </h1>
            <p className="label mt-2">
              {t('results.title', { count: rows.length })} · {query.date}
            </p>
          </header>

          {rows.length === 0 ? (
            <div className="card p-6">
              <h2 className="font-display text-2xl">{t('results.none')}</h2>
              <p className="mt-2 text-sm text-ink-muted">{t('results.noneBody')}</p>
              <Alternatives alternatives={smartAlternatives(query)} onApply={applyAlternative} />
            </div>
          ) : (
            <>
              {/* ---- buckets ---- */}
              <section>
                <div className="grid gap-3 sm:grid-cols-2">
                  {buckets.map((row) => (
                    <div key={`${row.train.id}-${row.travel_class}-${row.bucket}`} className="space-y-2">
                      <TrainCard
                        row={row}
                        from={query.from}
                        to={query.to}
                        onSelect={() => select(row)}
                        onWatch={() => watch(row)}
                        watching={watching.includes(`${row.train.id}-${row.travel_class}`)}
                        selected={
                          booking.selection?.train.id === row.train.id &&
                          booking.selection?.travel_class === row.travel_class
                        }
                      />
                      <Chip
                        onClick={() => toggleCompare(row)}
                        selected={compare.some(
                          (c) => c.train.id === row.train.id && c.travel_class === row.travel_class,
                        )}
                      >
                        {t('results.compare')}
                      </Chip>
                    </div>
                  ))}
                </div>
              </section>

              {/* ---- alternatives, offered even when results exist ---- */}
              {alternatives.length > 0 && (
                <Alternatives alternatives={alternatives} onApply={applyAlternative} />
              )}

              {/* ---- compare ---- */}
              {compare.length >= 2 && (
                <CompareTable rows={compare} query={query} onSelect={select} />
              )}

              {/* ---- availability key ---- */}
              <section className="card-sunk p-4">
                <p className="label mb-3">{t('results.availabilityKey')}</p>
                <ul className="grid gap-2 sm:grid-cols-3">
                  {(
                    [
                      ['confirmed', 'Confirmed seat — yours on booking'],
                      ['attention', 'RAC or few left — you can still board'],
                      ['critical', 'Waitlist — may not confirm, refunded if not'],
                    ] as const
                  ).map(([tone, label]) => (
                    <li key={tone} className="flex items-center gap-2 text-sm text-ink-muted">
                      <StatusDot tone={tone} />
                      {label}
                    </li>
                  ))}
                </ul>
              </section>

              {/* ---- the full list, never hidden ---- */}
              <section>
                <SectionHeading>
                  <button
                    type="button"
                    onClick={() => setShowAll((v) => !v)}
                    className="transition-colors hover:text-ink"
                  >
                    {showAll ? t('results.hideAll') : t('results.seeAll', { count: rows.length })}
                  </button>
                </SectionHeading>

                <AnimatePresence initial={false}>
                  {showAll && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="grid gap-3 pt-1 sm:grid-cols-2">
                        {rows.map((row) => (
                          <TrainCard
                            key={`all-${row.train.id}-${row.travel_class}`}
                            row={row}
                            from={query.from}
                            to={query.to}
                            compact
                            onSelect={() => select(row)}
                            onWatch={() => watch(row)}
                            watching={watching.includes(`${row.train.id}-${row.travel_class}`)}
                          />
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </section>
            </>
          )}
        </div>
      </div>

      <Toast message={toast} onDone={() => setToast(null)} />
    </div>
  );
}

/* ------------------------------------------------------------ alternatives */

function Alternatives({
  alternatives,
  onApply,
}: {
  alternatives: Alternative[];
  onApply: (a: Alternative) => void;
}) {
  const { t } = useTranslation();
  if (alternatives.length === 0) return null;

  return (
    <section>
      <SectionHeading>{t('results.alternatives')}</SectionHeading>
      <ul className="space-y-2">
        {alternatives.map((alt) => (
          <li key={`${alt.kind}-${alt.label}`}>
            <button
              type="button"
              onClick={() => onApply(alt)}
              className="card flex w-full items-start gap-3 p-4 text-left transition-colors hover:border-rule-strong"
            >
              <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-attention" aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{alt.label}</span>
                <span className="mt-0.5 block text-sm text-ink-muted">{alt.reason}</span>
              </span>
              <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-ink-faint" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ---------------------------------------------------------------- compare */

function CompareTable({
  rows,
  query,
  onSelect,
}: {
  rows: RankedTrain[];
  query: SearchQuery;
  onSelect: (r: RankedTrain) => void;
}) {
  const { t } = useTranslation();
  const { L } = useLocalized();
  const winner = rows.reduce((a, b) => (b.score > a.score ? b : a));

  const fields = [
    { key: 'fare', label: t('results.fare'), value: (r: RankedTrain) => rupees(r.price) },
    {
      key: 'departs',
      label: t('results.departs'),
      value: (r: RankedTrain) =>
        r.train.stops.find((s) => s.station === query.from)?.departure ?? r.train.departure_time,
    },
    {
      key: 'duration',
      label: t('results.duration'),
      value: (r: RankedTrain) => formatDuration(r.train.duration_minutes),
    },
    {
      key: 'availability',
      label: 'Availability',
      value: (r: RankedTrain) => availabilityLabel(r.availability).headline,
    },
    { key: 'class', label: t('search.classLabel'), value: (r: RankedTrain) => t(`classes.${r.travel_class}`) },
  ];

  return (
    <section>
      <SectionHeading>{t('results.compare')}</SectionHeading>
      {/* Wide content scrolls inside its own container, never the page. */}
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[32rem] border-collapse text-sm">
          <thead>
            <tr className="border-b border-rule">
              <th scope="col" className="label px-4 py-3 text-left font-normal">
                &nbsp;
              </th>
              {rows.map((r) => (
                <th key={`${r.train.id}-${r.travel_class}`} scope="col" className="px-4 py-3 text-left">
                  <span className="block font-display text-base font-normal leading-tight">
                    {L(r.train.name)}
                  </span>
                  <span className="label mt-1 block">{r.train.number}</span>
                  {r.train.id === winner.train.id && r.travel_class === winner.travel_class && (
                    <Badge tone="confirmed" className="mt-2">
                      {t('results.compareVerdict')}
                    </Badge>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {fields.map((f) => (
              <tr key={f.key} className="border-b border-rule last:border-0">
                <th scope="row" className="label px-4 py-3 text-left font-normal">
                  {f.label}
                </th>
                {rows.map((r) => (
                  <td
                    key={`${f.key}-${r.train.id}-${r.travel_class}`}
                    className={cx('tnum px-4 py-3', f.key === 'fare' && 'font-semibold')}
                  >
                    {f.value(r)}
                  </td>
                ))}
              </tr>
            ))}
            <tr>
              <td className="px-4 py-3" />
              {rows.map((r) => (
                <td key={`act-${r.train.id}-${r.travel_class}`} className="px-4 py-3">
                  <Button size="sm" onClick={() => onSelect(r)}>
                    {t('results.select')}
                  </Button>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-sm text-ink-faint">
        {t('results.compareVerdict')}: {L(winner.train.name)} — {winner.reasons[0]}
      </p>
    </section>
  );
}
