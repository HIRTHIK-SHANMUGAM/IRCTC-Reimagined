import { useEffect, useState } from 'react';
import { CheckCircle2, Circle, LifeBuoy, Loader2, Phone } from 'lucide-react';
import type { Grievance } from '@/types';
import { GRIEVANCE_CATEGORIES, SUPPORT_CHANNELS } from '@/data/catalog';
import { repo } from '@/lib/backend';
import { Alert, Badge, Button, EmptyState, Input, PageHeader, Select, cx, useToast } from '@/components/ui';

const STEPS: { id: Grievance['status']; label: string }[] = [
  { id: 'filed', label: 'Filed' },
  { id: 'under_review', label: 'Under Review' },
  { id: 'resolved', label: 'Resolved' },
];

/**
 * Rail Madad (addendum §5). A real grievance form backed by Firestore — the
 * complaint is persisted under the user with a tracked status, not just a
 * toast that disappears.
 */
export function RailMadad() {
  const toast = useToast();
  const [category, setCategory] = useState(GRIEVANCE_CATEGORIES[0]);
  const [reference, setReference] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [cases, setCases] = useState<Grievance[]>([]);

  useEffect(() => {
    void repo.listGrievances().then(setCases).catch(() => setCases([]));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (description.trim().length < 10) {
      toast('Please describe what happened in a little more detail.');
      return;
    }
    setBusy(true);
    try {
      const filed = await repo.fileGrievance({ category, reference: reference.trim(), description: description.trim() });
      setCases((c) => [filed, ...c]);
      setDescription('');
      setReference('');
      toast(`Complaint ${filed.complaint_id} filed`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Rail Madad"
        subtitle="Report a problem with a journey. You get a complaint number and a status you can follow."
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2">
        {SUPPORT_CHANNELS.slice(0, 2).map((c) => (
          <div key={c.id} className="card flex items-center gap-3 p-4">
            <span className="icon-tile h-10 w-10">
              <Phone className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="tnum text-[1rem] font-extrabold text-ink">{c.value}</p>
              <p className="truncate text-[0.75rem] text-ink-muted">{c.label} · {c.detail}</p>
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={submit} className="card space-y-4 p-5">
        <h2 className="text-[1rem] font-bold text-ink">File a complaint</h2>

        <Select label="Category" value={category} onChange={(e) => setCategory(e.target.value)}>
          {GRIEVANCE_CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </Select>

        <Input
          label="PNR or train number"
          help="Optional, but it lets us route the complaint to the right depot."
          placeholder="e.g. 2345678901 or 12608"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
        />

        <div>
          <label htmlFor="rm-desc" className="mb-1.5 block text-[0.8125rem] font-semibold text-ink">
            What happened?
          </label>
          <textarea
            id="rm-desc"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the problem, including the coach and time if you have them."
            className="w-full rounded-lg border border-line-strong bg-surface p-3.5 text-[0.9375rem] text-ink
                       placeholder:text-ink-faint focus:border-navy-500 focus:outline-none focus:ring-2 focus:ring-navy-500/20"
          />
        </div>

        <Button type="submit" full size="lg" loading={busy} icon={<LifeBuoy className="h-4 w-4" />}>
          Submit complaint
        </Button>
      </form>

      <section className="mt-8">
        <h2 className="mb-3 text-[1.0625rem] font-bold text-ink">Your complaints</h2>
        {cases.length === 0 ? (
          <EmptyState
            icon={<LifeBuoy className="h-5 w-5" />}
            title="No complaints filed"
            body="Anything you report will appear here with its current status."
          />
        ) : (
          <ul className="space-y-3">
            {cases.map((c) => (
              <li key={c.id} className="card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="tnum text-[0.9375rem] font-bold text-ink">{c.complaint_id}</p>
                    <p className="mt-0.5 text-[0.8125rem] text-ink-muted">{c.category}</p>
                  </div>
                  <Badge tone={c.status === 'resolved' ? 'confirmed' : 'attention'}>
                    {STEPS.find((s) => s.id === c.status)?.label}
                  </Badge>
                </div>

                <p className="mt-2.5 text-[0.875rem] leading-relaxed text-ink">{c.description}</p>

                <ol className="mt-4 flex items-center gap-2">
                  {STEPS.map((s, i) => {
                    const currentIndex = STEPS.findIndex((x) => x.id === c.status);
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
                          <span
                            className={cx('h-px flex-1', done ? 'bg-confirmed/40' : 'bg-line')}
                          />
                        )}
                      </li>
                    );
                  })}
                </ol>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Alert tone="neutral" className="mt-6">
        This is a demonstration build. Complaints are stored against your account so the flow is real,
        but nothing is sent to Indian Railways.
      </Alert>
    </div>
  );
}
