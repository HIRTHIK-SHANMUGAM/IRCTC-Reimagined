import { useMemo, useState } from 'react';
import { Award, Check, Gift, Sparkles } from 'lucide-react';
import { REWARDS, TIER_THRESHOLDS } from '@/data/catalog';
import { useSession } from '@/store/session';
import { rupees } from '@/lib/format';
import { Alert, Badge, Button, EmptyState, PageHeader, cx, useToast } from '@/components/ui';

/**
 * Loyalty & Rewards (addendum §5). Points are derived from what the account
 * has actually spent, so the tier badge in the header is earned rather than
 * decorative.
 */
export function Loyalty() {
  const toast = useToast();
  const journeys = useSession((s) => s.journeys);
  const bookings = useSession((s) => s.bookings);
  const wallet = useSession((s) => s.wallet);
  const creditWallet = useSession((s) => s.creditWallet);

  const [redeemed, setRedeemed] = useState<string[]>([]);

  const spend = useMemo(
    () =>
      journeys.filter((j) => j.status !== 'cancelled').reduce((s, j) => s + j.total_fare, 0) +
      bookings.filter((b) => b.status !== 'cancelled').reduce((s, b) => s + b.total, 0),
    [journeys, bookings],
  );

  // One point per ₹100, plus a seeded starting balance so the screen is alive.
  const points = 1240 + Math.floor(spend / 100);
  const tierIndex = TIER_THRESHOLDS.reduce((acc, t, i) => (points >= t.points ? i : acc), 0);
  const tier = TIER_THRESHOLDS[tierIndex];
  const next = TIER_THRESHOLDS[tierIndex + 1];
  const toNext = next ? next.points - points : 0;
  const pct = next
    ? Math.min(100, ((points - tier.points) / (next.points - tier.points)) * 100)
    : 100;

  async function redeem(id: string, cost: number, name: string) {
    if (points < cost) return;
    setRedeemed((r) => [...r, id]);
    if (id === 'rw-6') await creditWallet(250, 'Reward redeemed · wallet top-up');
    toast(`Redeemed: ${name}`);
  }

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Loyalty & Rewards" subtitle="Points on everything you book, redeemable against your next trip." />

      <div className="card overflow-hidden">
        <div
          className={cx(
            'p-6 text-white',
            tier.tier === 'Platinum' ? 'bg-navy-900' : tier.tier === 'Gold' ? 'bg-saffron-600' : 'bg-navy-700',
          )}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 text-[0.8125rem] font-semibold text-white/80">
                <Award className="h-4 w-4" aria-hidden="true" /> {tier.tier} Member
              </p>
              <p className="tnum mt-2 text-[2.25rem] font-extrabold leading-none">
                {points.toLocaleString('en-IN')}
              </p>
              <p className="mt-1 text-[0.8125rem] text-white/75">points available</p>
            </div>
            <div className="text-right">
              <p className="text-[0.75rem] text-white/75">Lifetime spend</p>
              <p className="tnum text-[1.125rem] font-bold">{rupees(spend)}</p>
            </div>
          </div>

          {next && (
            <div className="mt-5">
              <div className="flex justify-between text-[0.75rem] text-white/80">
                <span>{tier.tier}</span>
                <span className="tnum">{toNext.toLocaleString('en-IN')} points to {next.tier}</span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/25">
                <div className="h-full rounded-full bg-white transition-all" style={{ width: `${pct}%` }} />
              </div>
            </div>
          )}
        </div>

        <div className="grid gap-px bg-line sm:grid-cols-3">
          {TIER_THRESHOLDS.map((t) => (
            <div key={t.tier} className={cx('bg-surface p-4', t.tier === tier.tier && 'bg-navy-50')}>
              <p className="flex items-center gap-2 text-[0.875rem] font-bold text-ink">
                {t.tier}
                {t.tier === tier.tier && <Badge tone="accent">You</Badge>}
              </p>
              <p className="tnum mt-0.5 text-[0.75rem] text-ink-muted">
                {t.points.toLocaleString('en-IN')}+ points
              </p>
              <ul className="mt-2.5 space-y-1">
                {t.perks.map((p) => (
                  <li key={p} className="flex items-start gap-1.5 text-[0.75rem] text-ink-muted">
                    <Check className="mt-0.5 h-3 w-3 shrink-0 text-confirmed" aria-hidden="true" />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <section className="mt-7">
        <h2 className="mb-3 text-[1.0625rem] font-bold text-ink">Redeem your points</h2>
        {REWARDS.length === 0 ? (
          <EmptyState icon={<Gift className="h-5 w-5" />} title="No rewards available" />
        ) : (
          <ul className="stagger grid gap-3 sm:grid-cols-2">
            {REWARDS.map((r) => {
              const affordable = points >= r.points;
              const done = redeemed.includes(r.id);
              return (
                <li key={r.id} className={cx('card p-4', !affordable && 'opacity-60')}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[0.9375rem] font-bold text-ink">{r.name}</p>
                      <p className="mt-1 text-[0.8125rem] leading-relaxed text-ink-muted">{r.detail}</p>
                    </div>
                    <Badge tone="neutral">{r.category}</Badge>
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <p className="tnum text-[0.875rem] font-bold text-navy-700">
                      {r.points.toLocaleString('en-IN')} pts
                    </p>
                    <Button
                      size="sm"
                      variant={done ? 'secondary' : 'primary'}
                      disabled={!affordable || done}
                      icon={done ? <Check className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
                      onClick={() => void redeem(r.id, r.points, r.name)}
                    >
                      {done ? 'Redeemed' : affordable ? 'Redeem' : 'Not enough'}
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <Alert tone="neutral" className="mt-6">
        Your wallet balance is {rupees(wallet.balance)}. Rewards that pay out in cash credit it straight away.
      </Alert>
    </div>
  );
}
