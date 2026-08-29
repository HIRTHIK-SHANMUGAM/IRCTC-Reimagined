import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { ArrowRight, Compass, Moon, Users, Utensils, Volume1, Wallet } from 'lucide-react';
import { useSession } from '@/store/session';
import { useBooking } from '@/store/booking';
import { useLocalized } from '@/hooks/useLocalized';
import { exploreFrom, addDays, formatDuration } from '@/engine/search';
import { getStation, STATIONS } from '@/data/stations';
import { Button, Chip, EmptyState, SectionHeading, Select } from '@/components/ui';
import { rupees, todayISO } from '@/lib/format';

type Filter = 'weekend' | 'overnight' | 'quiet' | 'food' | 'family' | 'under1000';

/**
 * Explore. Discovery that funnels into a real booking path — never a dead-end
 * gallery (master prompt §8).
 */
export function Explore() {
  const { t } = useTranslation();
  const { L } = useLocalized();
  const navigate = useNavigate();
  const user = useSession((s) => s.user);
  const setQuery = useBooking((s) => s.setQuery);

  const [origin, setOrigin] = useState(user?.home_station ?? 'MAS');
  const [budget, setBudget] = useState(user?.preferences.max_budget ?? 1500);
  const [filters, setFilters] = useState<Filter[]>([]);

  const date = addDays(todayISO(), 2);

  const destinations = useMemo(() => {
    const rows = exploreFrom(origin, filters.includes('under1000') ? Math.min(budget, 1000) : budget, date);
    return rows.filter((r) => {
      if (filters.includes('overnight') && !r.overnight) return false;
      if (filters.includes('weekend') && r.duration > 12 * 60) return false;
      return true;
    });
  }, [origin, budget, filters, date]);

  const toggle = (f: Filter) =>
    setFilters((prev) => (prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]));

  const open = (to: string) => {
    setQuery({ from: origin, to, date, quota: 'General', passengers: 1 });
    navigate('/trains');
  };

  const FILTERS: { id: Filter; label: string; Icon: typeof Moon }[] = [
    { id: 'weekend', label: t('explore.weekend'), Icon: Compass },
    { id: 'overnight', label: t('explore.overnight'), Icon: Moon },
    { id: 'quiet', label: t('explore.quiet'), Icon: Volume1 },
    { id: 'food', label: t('explore.food'), Icon: Utensils },
    { id: 'family', label: t('explore.family'), Icon: Users },
    { id: 'under1000', label: t('explore.under1000'), Icon: Wallet },
  ];

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-extrabold tracking-tight text-4xl leading-tight">{t('explore.title')}</h1>
        <p className="mt-2 text-[0.9375rem] text-ink-muted">
          {t('explore.subtitle', { city: L(getStation(origin)?.city) })}
        </p>
      </header>

      <section className="card p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label={t('search.from')} value={origin} onChange={(e) => setOrigin(e.target.value)}>
            {STATIONS.map((s) => (
              <option key={s.code} value={s.code}>
                {L(s.name)} · {s.code}
              </option>
            ))}
          </Select>

          <div>
            <label htmlFor="ri-budget" className="label-ink mb-2 block">
              {t('explore.budget')} · <span className="tnum text-ink">{rupees(budget)}</span>
            </label>
            <input
              id="ri-budget"
              type="range"
              min={200}
              max={4000}
              step={100}
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value))}
              className="h-12 w-full accent-navy-700"
            />
          </div>
        </div>

        <div className="mt-5">
          <p className="label mb-2">{t('explore.filters')}</p>
          <div className="flex flex-wrap gap-2">
            {FILTERS.map(({ id, label, Icon }) => (
              <Chip
                key={id}
                selected={filters.includes(id)}
                onClick={() => toggle(id)}
                icon={<Icon className="h-3.5 w-3.5" aria-hidden="true" />}
              >
                {label}
              </Chip>
            ))}
          </div>
        </div>
      </section>

      {destinations.length === 0 ? (
        <EmptyState
          title={t('explore.noneFound')}
          art={<Compass className="h-7 w-7 text-ink-faint" aria-hidden="true" />}
          action={<Button onClick={() => setBudget(Math.min(4000, budget + 800))}>Raise the budget</Button>}
        />
      ) : (
        <section>
          <SectionHeading>
            {destinations.length} {destinations.length === 1 ? 'destination' : 'destinations'}
          </SectionHeading>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {destinations.map((d, i) => {
              const station = getStation(d.to);
              return (
                <motion.li
                  key={d.to}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.26, delay: Math.min(i * 0.03, 0.24), ease: [0.22, 1, 0.36, 1] }}
                >
                  <button
                    type="button"
                    onClick={() => open(d.to)}
                    className="card group flex h-full w-full flex-col p-5 text-left transition-colors hover:border-line-strong"
                  >
                    {/* Each card gets its own quiet piece of generative art,
                        seeded from the station code so it is stable. */}
                    <DestinationArt seed={d.to} />

                    <h3 className="mt-4 font-extrabold tracking-tight text-xl leading-tight">{L(station?.city)}</h3>
                    <p className="label mt-1.5">{L(station?.name)}</p>

                    <div className="mt-4 flex items-end justify-between gap-3 border-t border-line pt-4">
                      <div>
                        <p className="tnum text-lg font-semibold leading-none">{rupees(d.cheapest)}</p>
                        <p className="label mt-1.5">
                          {t('explore.hoursAway', { hours: formatDuration(d.duration) })}
                        </p>
                      </div>
                      <ArrowRight
                        className="h-4 w-4 shrink-0 text-ink-faint transition-transform group-hover:translate-x-0.5"
                        aria-hidden="true"
                      />
                    </div>
                  </button>
                </motion.li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

/**
 * Generative tile art, seeded per destination — the "Generative Tile Animation"
 * reference from recent.design. Cheap, stable, and never a stock photo.
 */
function DestinationArt({ seed }: { seed: string }) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const rand = (n: number) => ((h >>> (n % 24)) & 0xff) / 255;

  const bands = Array.from({ length: 5 }, (_, i) => ({
    y: 20 + i * 12,
    amp: 4 + rand(i * 3) * 10,
    opacity: 0.14 + i * 0.11,
  }));

  return (
    <div className="h-24 w-full overflow-hidden rounded-lg bg-navy-50">
      <svg viewBox="0 0 200 90" className="h-full w-full" aria-hidden="true" preserveAspectRatio="none">
        <circle cx={30 + rand(2) * 140} cy={22} r={12} fill="#B8730A" opacity="0.2" />
        {bands.map((b, i) => (
          <path
            key={i}
            d={`M0 ${b.y + 30} Q 50 ${b.y + 30 - b.amp}, 100 ${b.y + 30} T 200 ${b.y + 30} L 200 90 L 0 90 Z`}
            fill="#0F5F53"
            opacity={b.opacity}
          />
        ))}
        {/* A rail line running through, so every card says "by train". */}
        <line x1="0" y1="76" x2="200" y2="76" stroke="#0B4F45" strokeWidth="1.5" opacity="0.5" />
        {Array.from({ length: 14 }, (_, i) => (
          <rect key={i} x={i * 15} y="78" width="8" height="2.5" rx="1" fill="#0B4F45" opacity="0.28" />
        ))}
      </svg>
    </div>
  );
}
