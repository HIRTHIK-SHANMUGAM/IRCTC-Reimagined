import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Ban, RefreshCw } from 'lucide-react';
import { getStation } from '@/data/stations';
import { useSession } from '@/store/session';
import { useLocalized } from '@/hooks/useLocalized';
import { formatDate, rupees } from '@/lib/format';
import { Badge, EmptyState, PageHeader, cx } from '@/components/ui';

const REFUND_STEPS = ['initiated', 'processed'] as const;

/**
 * Cancelled Tickets (addendum §5). Every cancelled item across categories,
 * with the refund state shown honestly rather than left as "processing".
 */
export function Cancelled() {
  const { L } = useLocalized();
  const journeys = useSession((s) => s.journeys);
  const bookings = useSession((s) => s.bookings);

  const rows = useMemo(() => {
    const j = journeys
      .filter((x) => x.status === 'cancelled')
      .map((x) => ({
        id: x.id,
        title: `${L(x.train_name)} (${x.train_number})`,
        subtitle: `${L(getStation(x.from_station)?.name)} → ${L(getStation(x.to_station)?.name)}`,
        reference: x.pnr,
        date: x.journey_date,
        total: x.total_fare,
        refund: Math.round(x.total_fare * 0.8),
        cancelled_at: x.cancelled_at ?? 0,
        reason: x.cancellation_reason ?? 'Cancelled by traveller',
        refund_status: 'processed' as const,
      }));

    const b = bookings
      .filter((x) => x.status === 'cancelled')
      .map((x) => ({
        id: x.id,
        title: x.title,
        subtitle: x.subtitle,
        reference: x.reference,
        date: x.date,
        total: x.total,
        refund: x.refund_amount ?? Math.round(x.total * 0.8),
        cancelled_at: x.cancelled_at ?? 0,
        reason: x.cancellation_reason ?? 'Cancelled by traveller',
        refund_status: x.refund_status === 'none' ? ('initiated' as const) : (x.refund_status ?? 'initiated'),
      }));

    return [...j, ...b].sort((a, z) => z.cancelled_at - a.cancelled_at);
  }, [journeys, bookings, L]);

  const totalRefunded = rows.reduce((s, r) => s + r.refund, 0);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Cancelled Tickets"
        subtitle="What you cancelled, what it cost, and where the money went."
        action={
          rows.length > 0 ? (
            <div className="text-right">
              <p className="text-[0.6875rem] font-bold uppercase text-ink-faint">Total refunded</p>
              <p className="tnum text-[1.25rem] font-extrabold text-confirmed">{rupees(totalRefunded)}</p>
            </div>
          ) : undefined
        }
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={<Ban className="h-5 w-5" />}
          title="Nothing cancelled"
          body="Anything you cancel shows up here with its refund status."
          action={
            <Link
              to="/trips"
              className="inline-flex h-11 items-center rounded-lg bg-navy-700 px-5 text-[0.875rem] font-semibold text-white hover:bg-navy-600"
            >
              Go to My Trips
            </Link>
          }
        />
      ) : (
        <ul className="stagger space-y-3">
          {rows.map((r) => {
            const stepIndex = REFUND_STEPS.indexOf(r.refund_status as (typeof REFUND_STEPS)[number]);
            return (
              <li key={r.id} className="card p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[0.9375rem] font-bold text-ink">{r.title}</p>
                    <p className="mt-0.5 truncate text-[0.8125rem] text-ink-muted">{r.subtitle}</p>
                    <p className="tnum mt-1 text-[0.75rem] text-ink-muted">
                      {formatDate(r.date)} · {r.reference}
                    </p>
                  </div>
                  <Badge tone="critical">Cancelled</Badge>
                </div>

                <p className="mt-3 text-[0.8125rem] text-ink-muted">Reason: {r.reason}</p>

                <dl className="mt-4 grid grid-cols-3 gap-px overflow-hidden rounded-lg border border-line bg-line">
                  {[
                    ['Paid', rupees(r.total)],
                    ['Charge', `−${rupees(r.total - r.refund)}`],
                    ['Refunded', rupees(r.refund)],
                  ].map(([k, v], i) => (
                    <div key={k} className="bg-surface px-2 py-2.5 text-center">
                      <dt className="text-[0.625rem] font-bold uppercase text-ink-faint">{k}</dt>
                      <dd
                        className={cx(
                          'tnum mt-0.5 text-[0.8125rem] font-bold',
                          i === 1 ? 'text-critical' : i === 2 ? 'text-confirmed' : 'text-ink',
                        )}
                      >
                        {v}
                      </dd>
                    </div>
                  ))}
                </dl>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <p className="flex items-center gap-1.5 text-[0.8125rem] font-semibold text-confirmed">
                    <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                    {stepIndex >= 1
                      ? 'Refund credited to your eWallet'
                      : 'Refund on its way to your eWallet'}
                  </p>
                  <Link
                    to="/tdr"
                    className="text-[0.8125rem] font-bold text-navy-600 hover:text-navy-700"
                  >
                    Claim more via TDR →
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
