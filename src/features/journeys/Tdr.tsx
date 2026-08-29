import { useEffect, useState } from 'react';
import { CheckCircle2, Circle, FileText, Loader2 } from 'lucide-react';
import type { TdrClaim } from '@/types';
import { TDR_REASONS } from '@/data/catalog';
import { repo } from '@/lib/backend';
import { useSession } from '@/store/session';
import { formatDate, rupees } from '@/lib/format';
import { Alert, Badge, Button, EmptyState, Input, PageHeader, Select, cx, useToast } from '@/components/ui';

const STEPS: { id: TdrClaim['status']; label: string }[] = [
  { id: 'filed', label: 'Filed' },
  { id: 'under_review', label: 'Under Review' },
  { id: 'resolved', label: 'Resolved' },
];

/**
 * TDR Status (addendum §5). A Ticket Deposit Receipt is the claim route when
 * normal cancellation does not apply — the form files a real record and the
 * tracker below shows where it has got to.
 */
export function Tdr() {
  const toast = useToast();
  const journeys = useSession((s) => s.journeys);
  const bookings = useSession((s) => s.bookings);

  const [pnr, setPnr] = useState('');
  const [reason, setReason] = useState(TDR_REASONS[0]);
  const [claims, setClaims] = useState<TdrClaim[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void repo.listTdrClaims().then(setClaims).catch(() => setClaims([]));
  }, []);

  const references = [
    ...journeys.map((j) => ({ ref: j.pnr, label: `${j.train_number} · ${j.journey_date}`, amount: j.total_fare })),
    ...bookings.map((b) => ({ ref: b.reference, label: `${b.title} · ${b.date}`, amount: b.total })),
  ];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const match = references.find((r) => r.ref.toUpperCase() === pnr.trim().toUpperCase());
    if (!match) {
      toast('That reference is not on your account. Pick one from the list below.');
      return;
    }
    setBusy(true);
    try {
      const filed = await repo.fileTdrClaim({
        pnr: match.ref,
        reason,
        amount: Math.round(match.amount * 0.9),
      });
      setClaims((c) => [filed, ...c]);
      setPnr('');
      toast(`TDR ${filed.tdr_id} filed`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="TDR Status"
        subtitle="Claim a refund when the normal cancellation route does not cover what happened."
      />

      <Alert tone="info" className="mb-5">
        File a TDR when the train was cancelled or ran more than three hours late, the coach was not
        attached, the AC failed, or your confirmed berth was not provided. Ordinary cancellations refund
        automatically and do not need this.
      </Alert>

      <form onSubmit={submit} className="card space-y-4 p-5">
        <h2 className="text-[1rem] font-bold text-ink">File a claim</h2>

        <Input
          label="PNR or booking reference"
          value={pnr}
          onChange={(e) => setPnr(e.target.value)}
          placeholder="e.g. 2345678901"
          className="tnum"
        />

        {references.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {references.slice(0, 4).map((r) => (
              <button
                key={r.ref}
                type="button"
                onClick={() => setPnr(r.ref)}
                className="rounded-md border border-line px-2.5 py-1.5 text-[0.75rem] font-medium
                           text-ink-muted transition-colors hover:border-navy-300 hover:bg-navy-50 hover:text-navy-700"
              >
                <span className="tnum font-bold">{r.ref}</span> · {r.label}
              </button>
            ))}
          </div>
        )}

        <Select label="Reason" value={reason} onChange={(e) => setReason(e.target.value)}>
          {TDR_REASONS.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </Select>

        <Button type="submit" full size="lg" loading={busy} icon={<FileText className="h-4 w-4" />}>
          File TDR
        </Button>
      </form>

      <section className="mt-8">
        <h2 className="mb-3 text-[1.0625rem] font-bold text-ink">Your claims</h2>
        {claims.length === 0 ? (
          <EmptyState
            icon={<FileText className="h-5 w-5" />}
            title="No claims filed"
            body="Anything you file appears here with its review status."
          />
        ) : (
          <ul className="stagger space-y-3">
            {claims.map((c) => {
              const currentIndex = STEPS.findIndex((x) => x.id === c.status);
              return (
                <li key={c.id} className="card p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="tnum text-[0.9375rem] font-bold text-ink">{c.tdr_id}</p>
                      <p className="tnum mt-0.5 text-[0.8125rem] text-ink-muted">
                        PNR {c.pnr} · filed {formatDate(new Date(c.created_at).toISOString().slice(0, 10))}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge tone={c.status === 'resolved' ? 'confirmed' : 'attention'}>
                        {STEPS[currentIndex]?.label}
                      </Badge>
                      <p className="tnum mt-1.5 text-[0.9375rem] font-extrabold text-ink">
                        {rupees(c.amount)}
                      </p>
                    </div>
                  </div>

                  <p className="mt-2.5 text-[0.875rem] text-ink">{c.reason}</p>

                  <ol className="mt-4 flex items-center gap-2">
                    {STEPS.map((s, i) => {
                      const done = i <= currentIndex;
                      return (
                        <li key={s.id} className="flex flex-1 items-center gap-2">
                          <span className="flex items-center gap-1.5">
                            {done ? (
                              i === currentIndex && c.status !== 'resolved' ? (
                                <Loader2 className="h-4 w-4 animate-spin-slow text-attention" />
                              ) : (
                                <CheckCircle2 className="h-4 w-4 text-confirmed" />
                              )
                            ) : (
                              <Circle className="h-4 w-4 text-line-strong" />
                            )}
                            <span
                              className={cx(
                                'whitespace-nowrap text-[0.75rem] font-semibold',
                                done ? 'text-ink' : 'text-ink-faint',
                              )}
                            >
                              {s.label}
                            </span>
                          </span>
                          {i < STEPS.length - 1 && (
                            <span className={cx('h-px flex-1', done ? 'bg-confirmed/40' : 'bg-line')} />
                          )}
                        </li>
                      );
                    })}
                  </ol>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
