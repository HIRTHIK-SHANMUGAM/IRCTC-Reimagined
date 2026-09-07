import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRightLeft, Calendar, ChevronDown, Search, Zap } from 'lucide-react';
import type { Quota, TravelClass } from '@/types';
import { STATIONS } from '@/data/stations';
import { useSession } from '@/store/session';
import { useLocalized } from '@/hooks/useLocalized';
import { todayISO } from '@/lib/format';
import { Button, Select, Stepper, cx } from '@/components/ui';

const CLASSES: { id: TravelClass; label: string }[] = [
  { id: 'SL', label: 'Sleeper' },
  { id: '3A', label: 'AC 3 Tier' },
  { id: '2A', label: 'AC 2 Tier' },
  { id: '1A', label: 'AC First Class' },
  { id: 'CC', label: 'AC Chair Car' },
  { id: 'EC', label: 'Executive Chair Car' },
  { id: '2S', label: 'Second Sitting' },
];

const QUOTAS: Quota[] = ['General', 'Tatkal', 'Premium Tatkal', 'Ladies', 'Senior', 'Divyangjan'];

export interface SearchValues {
  from: string;
  to: string;
  date: string;
  travel_class: TravelClass;
  quota: Quota;
  passengers: number;
}

export function defaultSearch(): SearchValues {
  return {
    from: 'MAS',
    to: 'SBC',
    date: todayISO(),
    travel_class: '3A',
    quota: 'General',
    passengers: 1,
  };
}

/**
 * The dashboard search card (addendum §3). Tatkal mode collapses it to the
 * fewest possible fields and one big CTA — at 10am the cost of a extra
 * dropdown is a lost seat (master prompt, Tatkal UX).
 */
export function SearchCard({
  value,
  onChange,
  onSubmit,
  tatkal,
}: {
  value: SearchValues;
  onChange: (v: SearchValues) => void;
  onSubmit: (v: SearchValues) => void;
  tatkal?: boolean;
}) {
  const { t } = useTranslation();
  const { L } = useLocalized();
  const saved = useSession((s) => s.saved);
  const [recentOpen, setRecentOpen] = useState(false);

  const set = <K extends keyof SearchValues>(k: K, v: SearchValues[K]) =>
    onChange({ ...value, [k]: v });

  function swap() {
    onChange({ ...value, from: value.to, to: value.from });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(value);
      }}
      className={cx('card p-4 sm:p-5', tatkal && 'border-confirmed/30 bg-confirmed-soft/25')}
    >
      <div
        className={cx(
          'grid gap-3',
          tatkal ? 'sm:grid-cols-2 lg:grid-cols-3' : 'sm:grid-cols-2 lg:grid-cols-[1fr_auto_1fr]',
        )}
      >
        <Select label={t('ui.from')} value={value.from} onChange={(e) => set('from', e.target.value)}>
          {STATIONS.map((s) => (
            <option key={s.code} value={s.code}>
              {L(s.name)} ({s.code})
            </option>
          ))}
        </Select>

        {!tatkal && (
          <div className="flex items-end justify-center pb-1 lg:pb-0">
            <button
              type="button"
              onClick={swap}
              aria-label="Swap origin and destination"
              className="grid h-11 w-11 place-items-center rounded-full border border-line-strong bg-surface
                         text-navy-700 transition-all duration-150 hover:rotate-180 hover:border-navy-400 hover:bg-navy-50"
            >
              <ArrowRightLeft className="h-4 w-4" />
            </button>
          </div>
        )}

        <Select label={t('ui.to')} value={value.to} onChange={(e) => set('to', e.target.value)}>
          {STATIONS.map((s) => (
            <option key={s.code} value={s.code}>
              {L(s.name)} ({s.code})
            </option>
          ))}
        </Select>
      </div>

      <div className={cx('mt-3 grid gap-3', tatkal ? 'sm:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-4')}>
        <div>
          <label htmlFor="ri-date" className="mb-1.5 block text-[0.8125rem] font-semibold text-ink">
            {t('ui.date')}
          </label>
          <div className="relative">
            <Calendar
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint"
              aria-hidden="true"
            />
            <input
              id="ri-date"
              type="date"
              value={value.date}
              min={todayISO()}
              onChange={(e) => set('date', e.target.value)}
              className="tnum h-12 w-full rounded-lg border border-line-strong bg-surface pl-10 pr-3
                         text-[0.9375rem] text-ink transition-colors
                         focus:border-navy-500 focus:outline-none focus:ring-2 focus:ring-navy-500/20"
            />
          </div>
        </div>

        {!tatkal && (
          <Select
            label={t('ui.travelClass')}
            value={value.travel_class}
            onChange={(e) => set('travel_class', e.target.value as TravelClass)}
          >
            {CLASSES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </Select>
        )}

        {!tatkal && (
          <Select label={t('ui.quota')} value={value.quota} onChange={(e) => set('quota', e.target.value as Quota)}>
            {QUOTAS.map((q) => (
              <option key={q} value={q}>
                {q}
              </option>
            ))}
          </Select>
        )}

        <Stepper
          label={t('ui.travellers')}
          value={value.passengers}
          onChange={(v) => set('passengers', v)}
          min={1}
          max={6}
          suffix="Adult"
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button
          type="submit"
          size="lg"
          variant={tatkal ? 'success' : 'primary'}
          className="flex-1"
          icon={tatkal ? <Zap className="h-4 w-4" /> : <Search className="h-4 w-4" />}
        >
          {tatkal ? 'Find Tatkal seats now' : t('ui.searchTrains')}
        </Button>

        {!tatkal && saved.length > 0 && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setRecentOpen((v) => !v)}
              className="flex items-center gap-1.5 whitespace-nowrap px-2 text-[0.8125rem] font-bold text-navy-600 hover:text-navy-700"
            >
              {t('ui.recentSearches')}
              <ChevronDown className={cx('h-4 w-4 transition-transform', recentOpen && 'rotate-180')} />
            </button>
            {recentOpen && (
              <div className="absolute right-0 top-full z-30 mt-2 w-64 animate-rise-in rounded-card border border-line bg-surface p-1.5 shadow-panel">
                {saved.slice(0, 6).map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      onChange({
                        ...value,
                        from: s.from,
                        to: s.to,
                        date: s.date < todayISO() ? todayISO() : s.date,
                        travel_class: s.class ?? value.travel_class,
                      });
                      setRecentOpen(false);
                    }}
                    className="w-full rounded-md px-3 py-2 text-left transition-colors hover:bg-navy-50"
                  >
                    <span className="block text-[0.8125rem] font-semibold text-ink">
                      {s.from} → {s.to}
                    </span>
                    <span className="tnum block text-[0.75rem] text-ink-muted">{s.date}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </form>
  );
}
