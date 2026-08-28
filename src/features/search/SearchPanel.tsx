import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeftRight, ChevronDown, Search as SearchIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Quota, SearchQuery, TravelClass } from '@/types';
import { STATIONS, getStation } from '@/data/stations';
import { Button, Chip, Select, cx } from '@/components/ui';
import { useLocalized } from '@/hooks/useLocalized';
import { addDays } from '@/engine/search';
import { todayISO } from '@/lib/format';

const CLASSES: TravelClass[] = ['SL', '3A', '2A', '1A', 'CC', 'EC', '2S'];
const QUOTAS: Quota[] = ['General', 'Tatkal', 'Premium Tatkal', 'Ladies', 'Senior', 'Divyangjan'];

/**
 * Progressive disclosure: Where → When → How. Everything else — class, quota,
 * boarding point, concession — stays collapsed until asked for (§8).
 */
export function SearchPanel({
  query,
  onChange,
  onSubmit,
}: {
  query: SearchQuery;
  onChange: (patch: Partial<SearchQuery>) => void;
  onSubmit: () => void;
}) {
  const { t } = useTranslation();
  const { L } = useLocalized();
  const [advanced, setAdvanced] = useState(false);

  const stationOptions = STATIONS.map((s) => ({
    code: s.code,
    label: `${L(s.name)} · ${s.code}`,
  }));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="card p-5"
    >
      {/* ---- Where ---- */}
      <div className="relative grid gap-3 sm:grid-cols-2">
        <Select
          label={t('search.from')}
          value={query.from}
          onChange={(e) => onChange({ from: e.target.value })}
        >
          {stationOptions.map((s) => (
            <option key={s.code} value={s.code}>
              {s.label}
            </option>
          ))}
        </Select>

        <Select
          label={t('search.to')}
          value={query.to}
          onChange={(e) => onChange({ to: e.target.value })}
        >
          {stationOptions.map((s) => (
            <option key={s.code} value={s.code}>
              {s.label}
            </option>
          ))}
        </Select>

        <button
          type="button"
          onClick={() => onChange({ from: query.to, to: query.from })}
          aria-label={t('search.swap')}
          className={cx(
            'absolute left-1/2 top-[3.05rem] hidden h-9 w-9 -translate-x-1/2 place-items-center rounded-full',
            'border border-rule-strong bg-canvas-raised text-ink-muted transition-colors',
            'hover:border-ink-faint hover:text-ink sm:grid',
          )}
        >
          <ArrowLeftRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* ---- When ---- */}
      <div className="mt-5">
        <label htmlFor="ri-date" className="label-ink mb-2 block">
          {t('search.when')}
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <input
            id="ri-date"
            type="date"
            value={query.date}
            min={todayISO()}
            onChange={(e) => onChange({ date: e.target.value })}
            className="tnum h-12 rounded-xl border border-rule-strong bg-canvas-raised px-4 text-[0.9375rem] focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/25"
          />
          <Chip selected={query.date === todayISO()} onClick={() => onChange({ date: todayISO() })}>
            {t('search.today')}
          </Chip>
          <Chip
            selected={query.date === addDays(todayISO(), 1)}
            onClick={() => onChange({ date: addDays(todayISO(), 1) })}
          >
            {t('search.tomorrow')}
          </Chip>
        </div>
      </div>

      {/* ---- How ---- */}
      <div className="mt-5">
        <span className="label-ink mb-2 block">{t('search.how')}</span>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ['balanced', t('search.priorityBalanced')],
              ['cheapest', t('search.priorityCheapest')],
              ['fastest', t('search.priorityFastest')],
              ['comfort', t('search.priorityComfort')],
            ] as const
          ).map(([id, label]) => (
            <Chip
              key={id}
              selected={(query.priority ?? 'balanced') === id}
              onClick={() => onChange({ priority: id })}
            >
              {label}
            </Chip>
          ))}
        </div>
      </div>

      {/* ---- Everything else, collapsed ---- */}
      <button
        type="button"
        onClick={() => setAdvanced((v) => !v)}
        aria-expanded={advanced}
        className="mt-5 flex items-center gap-1.5 text-sm text-ink-muted transition-colors hover:text-ink"
      >
        {t('search.advanced')}
        <ChevronDown
          className={cx('h-3.5 w-3.5 transition-transform duration-200', advanced && 'rotate-180')}
          aria-hidden="true"
        />
      </button>

      <AnimatePresence initial={false}>
        {advanced && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="grid gap-3 pt-4 sm:grid-cols-3">
              <Select
                label={t('search.classLabel')}
                value={query.travel_class ?? ''}
                onChange={(e) =>
                  onChange({ travel_class: (e.target.value || undefined) as TravelClass | undefined })
                }
              >
                <option value="">{t('search.anyClass')}</option>
                {CLASSES.map((c) => (
                  <option key={c} value={c}>
                    {t(`classes.${c}`)}
                  </option>
                ))}
              </Select>

              <Select
                label={t('search.quota')}
                value={query.quota}
                onChange={(e) => onChange({ quota: e.target.value as Quota })}
              >
                {QUOTAS.map((q) => (
                  <option key={q} value={q}>
                    {q}
                  </option>
                ))}
              </Select>

              <Select
                label={t('search.passengers')}
                value={String(query.passengers)}
                onChange={(e) => onChange({ passengers: Number(e.target.value) })}
              >
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <option key={n} value={n}>
                    {n} {n === 1 ? t('common.traveller') : t('common.travellers')}
                  </option>
                ))}
              </Select>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Button type="submit" full size="lg" className="mt-6" icon={<SearchIcon className="h-4 w-4" />}>
        {t('search.find')}
      </Button>

      <p className="mt-3 text-center text-sm text-ink-faint">
        {L(getStation(query.from)?.city)} → {L(getStation(query.to)?.city)}
      </p>
    </form>
  );
}
