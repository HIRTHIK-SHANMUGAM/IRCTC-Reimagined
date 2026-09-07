import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Heart } from 'lucide-react';
import type { Train, TravelClass } from '@/types';
import { availabilityFor, availabilityLabel } from '@/engine/availability';
import { formatDuration } from '@/engine/search';
import { getStation } from '@/data/stations';
import { useLocalized } from '@/hooks/useLocalized';
import { rupees } from '@/lib/format';
import { Badge, Button, Tooltip, cx } from '@/components/ui';

const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const TONE_TEXT = {
  confirmed: 'text-confirmed',
  attention: 'text-attention',
  critical: 'text-critical',
} as const;

/**
 * One train in the results list, at the reference's information density:
 * name + number, type, times and station codes, duration, the run-days strip,
 * a compact class grid with `AVL nn` counts, the cheapest fare, and the
 * actions. The AVL count keeps the familiar compact form but carries the plain
 * language explanation in a tooltip, so nothing is left as an unexplained code.
 */
export function TrainRow({
  train,
  date,
  badge,
  onSelect,
  onWatch,
  watched,
}: {
  train: Train;
  date: string;
  badge?: string;
  onSelect: (t: Train, c: TravelClass) => void;
  onWatch?: (t: Train) => void;
  watched?: boolean;
}) {
  const { t } = useTranslation();
  const { L } = useLocalized();
  const [routeOpen, setRouteOpen] = useState(false);
  const [showAllClasses, setShowAllClasses] = useState(false);

  const from = getStation(train.from_station);
  const to = getStation(train.to_station);

  const rows = train.classes.map((c) => ({
    cls: c.name,
    avail: availabilityFor(train, c.name, date),
  }));
  const visible = showAllClasses ? rows : rows.slice(0, 4);
  const hidden = rows.length - visible.length;
  const cheapest = Math.min(...rows.map((r) => r.avail.price || Infinity));

  return (
    <article className="lift card overflow-hidden">
      <div className="p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {badge && <Badge tone="info">{badge}</Badge>}
              <h3 className="truncate text-[1rem] font-bold text-ink">
                {L(train.name)}{' '}
                <span className="tnum font-semibold text-ink-muted">({train.number})</span>
              </h3>
            </div>
            <p className="mt-1 text-[0.75rem] font-semibold uppercase tracking-wide text-ink-faint">
              {train.is_overnight ? 'Superfast' : 'Express'}
              {train.has_pantry && ' · Pantry'}
              {` · ${Math.round(train.punctuality * 100)}% on time`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {onWatch && (
              <button
                type="button"
                onClick={() => onWatch(train)}
                aria-label={watched ? 'Remove from watchlist' : 'Watch this train'}
                aria-pressed={watched}
                className={cx(
                  'grid h-9 w-9 place-items-center rounded-lg border transition-colors',
                  watched
                    ? 'border-critical/30 bg-critical-soft text-critical'
                    : 'border-line text-ink-faint hover:border-navy-300 hover:bg-navy-50 hover:text-navy-700',
                )}
              >
                <Heart className={cx('h-4 w-4', watched && 'fill-current')} />
              </button>
            )}
            <div className="text-right">
              <p className="text-[0.6875rem] font-semibold uppercase text-ink-faint">{t('ui.startingFrom')}</p>
              <p className="tnum text-[1.0625rem] font-extrabold text-ink">
                {Number.isFinite(cheapest) ? rupees(cheapest) : '—'}
              </p>
            </div>
          </div>
        </div>

        {/* times + duration + run days */}
        <div className="mt-4 grid gap-4 sm:grid-cols-[auto_1fr_auto] sm:items-center">
          <div className="flex items-center gap-4">
            <div>
              <p className="tnum text-[1.125rem] font-bold leading-none text-ink">{train.departure_time}</p>
              <p className="mt-1.5 text-[0.75rem] text-ink-muted">{L(from?.name)}</p>
            </div>
            <div className="min-w-[4.5rem] text-center">
              <p className="text-[0.6875rem] font-semibold text-ink-faint">
                {formatDuration(train.duration_minutes)}
              </p>
              <div className="my-1 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-line-strong" />
                <span className="h-px flex-1 bg-line-strong" />
                <span className="h-1.5 w-1.5 rounded-full bg-line-strong" />
              </div>
              <p className="text-[0.6875rem] text-ink-faint">
                {train.is_overnight ? 'Overnight' : 'Non-stop'}
              </p>
            </div>
            <div>
              <p className="tnum text-[1.125rem] font-bold leading-none text-ink">{train.arrival_time}</p>
              <p className="mt-1.5 text-[0.75rem] text-ink-muted">{L(to?.name)}</p>
            </div>
          </div>

          <div className="flex gap-1 sm:justify-center">
            {DAY_LETTERS.map((d, i) => {
              const runs = train.runs_on.includes(i);
              return (
                <span
                  key={i}
                  title={runs ? 'Runs on this day' : 'Does not run on this day'}
                  className={cx(
                    'grid h-6 w-6 place-items-center rounded text-[0.6875rem] font-bold',
                    runs ? 'bg-navy-50 text-navy-700' : 'text-ink-faint/45',
                  )}
                >
                  {d}
                </span>
              );
            })}
          </div>

          <Button size="sm" onClick={() => onSelect(train, visible[0]?.cls ?? '3A')}>
            {t('ui.viewOptions')}
          </Button>
        </div>

        {/* class + availability grid */}
        <div className="mt-4 flex flex-wrap gap-2">
          {visible.map(({ cls, avail }) => {
            const label = availabilityLabel(avail);
            return (
              <Tooltip key={cls} label={label.detail}>
                <button
                  type="button"
                  onClick={() => onSelect(train, cls)}
                  className="lift min-w-[5.25rem] rounded-lg border border-line bg-surface-sunk px-3 py-2 text-left"
                >
                  <span className="block text-[0.6875rem] font-bold uppercase text-ink-muted">{cls}</span>
                  <span className="tnum mt-0.5 block text-[0.875rem] font-bold text-ink">
                    {rupees(avail.price)}
                  </span>
                  <span
                    className={cx(
                      'tnum mt-0.5 block text-[0.6875rem] font-bold',
                      TONE_TEXT[label.tone],
                    )}
                  >
                    {avail.state === 'available'
                      ? `AVL ${avail.available_seats}`
                      : avail.state === 'rac'
                        ? 'RAC'
                        : avail.state === 'waitlist'
                          ? `WL ${avail.waitlist_position}`
                          : '—'}
                  </span>
                </button>
              </Tooltip>
            );
          })}

          {hidden > 0 && (
            <button
              type="button"
              onClick={() => setShowAllClasses(true)}
              className="min-w-[4rem] rounded-lg border border-dashed border-line-strong px-3 py-2
                         text-[0.75rem] font-bold text-navy-600 transition-colors hover:bg-navy-50"
            >
              +{hidden} More
            </button>
          )}
        </div>
      </div>

      {/* route + halts */}
      <div className="border-t border-line">
        <button
          type="button"
          onClick={() => setRouteOpen((v) => !v)}
          aria-expanded={routeOpen}
          className="flex w-full items-center justify-between px-4 py-2.5 text-[0.8125rem] font-semibold
                     text-navy-600 transition-colors hover:bg-navy-50 sm:px-5"
        >
          {t('ui.viewRoute')}
          <ChevronDown className={cx('h-4 w-4 transition-transform', routeOpen && 'rotate-180')} />
        </button>

        {routeOpen && (
          <ol className="animate-rise-in space-y-0 border-t border-line px-4 py-3 sm:px-5">
            {train.stops.map((s, i) => {
              const st = getStation(s.station);
              return (
                <li key={s.station} className="flex items-start gap-3 py-1.5">
                  <span className="mt-1.5 flex flex-col items-center">
                    <span
                      className={cx(
                        'h-2 w-2 rounded-full',
                        i === 0 || i === train.stops.length - 1 ? 'bg-navy-700' : 'bg-line-strong',
                      )}
                    />
                    {i < train.stops.length - 1 && <span className="h-6 w-px bg-line" />}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-wrap items-baseline justify-between gap-2">
                    <span className="truncate text-[0.8125rem] font-medium text-ink">
                      {L(st?.name) || s.station}
                    </span>
                    <span className="tnum text-[0.75rem] text-ink-muted">
                      {s.arrival ?? '—'} → {s.departure ?? '—'}
                      {s.platform ? ` · PF ${s.platform}` : ''}
                      {` · ${s.distance_km} km`}
                    </span>
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </article>
  );
}
