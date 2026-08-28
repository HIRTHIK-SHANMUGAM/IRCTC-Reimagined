import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { ArrowRight, Bell, Sparkles, Utensils } from 'lucide-react';
import type { RankedTrain } from '@/types';
import { Badge, Button, Chip, StatusDot, cx } from '@/components/ui';
import { availabilityLabel } from '@/engine/availability';
import { formatDuration } from '@/engine/search';
import { useLocalized } from '@/hooks/useLocalized';
import { getStation } from '@/data/stations';
import { arrivalNote, rupees } from '@/lib/format';

const BUCKET_TONE = {
  best: 'confirmed',
  cheapest: 'info',
  fastest: 'info',
  comfort: 'info',
  earliest: 'info',
} as const;

/**
 * The result card. Signage hierarchy from the SearchSystem references: mono
 * micro-labels, hairline rules, and the numerals — time and fare — carrying the
 * most optical weight on the card.
 */
export function TrainCard({
  row,
  from,
  to,
  onSelect,
  onWatch,
  watching,
  selected,
  compact,
}: {
  row: RankedTrain;
  from: string;
  to: string;
  onSelect?: () => void;
  onWatch?: () => void;
  watching?: boolean;
  selected?: boolean;
  compact?: boolean;
}) {
  const { t } = useTranslation();
  const { L } = useLocalized();
  const a = availabilityLabel(row.availability);
  const fromStop = row.train.stops.find((s) => s.station === from);
  const toStop = row.train.stops.find((s) => s.station === to);
  const departure = fromStop?.departure ?? row.train.departure_time;
  const arrival = toStop?.arrival ?? row.train.arrival_time;

  const bucketLabel =
    row.bucket === 'best'
      ? t('results.bestOverall')
      : row.bucket === 'cheapest'
        ? t('results.cheapest')
        : row.bucket === 'fastest'
          ? t('results.fastest')
          : row.bucket === 'comfort'
            ? t('results.comfort')
            : null;

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className={cx(
        'card p-5 transition-colors duration-150',
        selected ? 'border-teal-700 ring-1 ring-teal-700' : 'hover:border-rule-strong',
      )}
    >
      {bucketLabel && (
        <div className="mb-3">
          <Badge tone={BUCKET_TONE[row.bucket ?? 'best']}>
            {row.bucket === 'best' && <Sparkles className="h-3 w-3" aria-hidden="true" />}
            {bucketLabel}
          </Badge>
        </div>
      )}

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="truncate font-display text-xl leading-tight">{L(row.train.name)}</h3>
          <p className="label mt-1">
            {row.train.number} · {t(`classes.${row.travel_class}`)}
            {row.train.has_pantry && (
              <>
                {' · '}
                <Utensils className="inline h-3 w-3 align-[-1px]" aria-hidden="true" />
              </>
            )}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <div className="tnum text-2xl font-semibold leading-none">{rupees(row.price)}</div>
          <div className="label mt-1.5">{t('results.fare')}</div>
        </div>
      </div>

      {/* Departure → arrival, the numerals carrying the weight. */}
      <div className="mt-5 flex items-center gap-4">
        <div>
          <div className="tnum text-xl font-semibold leading-none">{departure}</div>
          <div className="label mt-1.5">{getStation(from)?.code ?? from}</div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-1 text-center">
            <span className="label">{formatDuration(row.train.duration_minutes)}</span>
          </div>
          <div className="relative h-px w-full bg-rule-strong">
            <ArrowRight
              className="absolute -top-[7px] right-0 h-3.5 w-3.5 text-rule-strong"
              aria-hidden="true"
            />
          </div>
        </div>

        <div className="text-right">
          <div className="tnum text-xl font-semibold leading-none">
            {arrival}
            <span className="align-super text-xs text-ink-faint">
              {arrivalNote(departure, row.train.duration_minutes)}
            </span>
          </div>
          <div className="label mt-1.5">{getStation(to)?.code ?? to}</div>
        </div>
      </div>

      {/* Availability, in plain language. Never a bare code. */}
      <div className="mt-4 flex items-start gap-2 rounded-lg bg-canvas-sunk px-3 py-2.5">
        <span className="mt-1.5">
          <StatusDot tone={a.tone} />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium">{a.headline}</p>
          <p className="mt-0.5 text-sm leading-snug text-ink-muted">{a.detail}</p>
        </div>
      </div>

      {/* The "Why?" that must accompany every recommendation. */}
      {!compact && row.reasons.length > 0 && (
        <div className="mt-4">
          <p className="label mb-2">{t('agent.why')}</p>
          <ul className="space-y-1">
            {row.reasons.map((r) => (
              <li key={r} className="flex gap-2 text-sm text-ink-muted">
                <span className="mt-[7px] block h-1 w-1 shrink-0 rounded-full bg-teal-600" aria-hidden="true" />
                {r}
              </li>
            ))}
          </ul>
        </div>
      )}

      {(onSelect || onWatch) && (
        <div className="mt-5 flex items-center gap-2">
          {onSelect && (
            <Button onClick={onSelect} variant={selected ? 'secondary' : 'primary'} size="sm">
              {selected ? t('results.selected') : t('results.select')}
            </Button>
          )}
          {onWatch && row.availability.state === 'waitlist' && (
            <Chip
              onClick={onWatch}
              selected={watching}
              icon={<Bell className="h-3.5 w-3.5" aria-hidden="true" />}
            >
              {watching ? t('results.watching') : t('results.watch')}
            </Chip>
          )}
        </div>
      )}
    </motion.article>
  );
}
