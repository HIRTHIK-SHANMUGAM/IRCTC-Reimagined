import { useState } from 'react';
import { Building2, Bus, Check, Copy, Gift, Percent, Plane } from 'lucide-react';
import { OFFERS } from '@/data/catalog';
import { rupees } from '@/lib/format';
import { Badge, Chip, IconTile, PageHeader, cx, useToast } from '@/components/ui';

const ICON = { percent: Percent, plane: Plane, building: Building2, bus: Bus, gift: Gift };

const FILTERS = [
  { id: 'all', label: 'All offers' },
  { id: 'train', label: 'Trains' },
  { id: 'flight', label: 'Flights' },
  { id: 'hotel', label: 'Hotels' },
  { id: 'bus', label: 'Buses' },
  { id: 'package', label: 'Packages' },
] as const;

/** Offers (addendum §5). Codes here actually reduce the total at any checkout. */
export function Offers() {
  const toast = useToast();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['id']>('all');
  const [copied, setCopied] = useState<string | null>(null);

  const rows = filter === 'all' ? OFFERS : OFFERS.filter((o) => o.category === filter || o.category === 'all');

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Offers"
        subtitle="Every code below works at checkout — apply it and watch the total drop."
      />

      <div className="mb-5 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Chip key={f.id} active={filter === f.id} onClick={() => setFilter(f.id)}>
            {f.label}
          </Chip>
        ))}
      </div>

      <ul className="stagger grid gap-4 sm:grid-cols-2">
        {rows.map((o) => {
          const Icon = ICON[o.icon] ?? Percent;
          return (
            <li key={o.id} className="lift card flex flex-col p-5">
              <div className="flex items-start gap-3">
                <IconTile icon={<Icon className="h-5 w-5" />} tone="saffron" size="lg" />
                <div className="min-w-0 flex-1">
                  <p className="text-[1.0625rem] font-extrabold text-ink">{o.title}</p>
                  <p className="mt-0.5 text-[0.8125rem] text-ink-muted">{o.applies_to}</p>
                </div>
              </div>

              <p className="mt-3 flex-1 text-[0.8125rem] leading-relaxed text-ink-muted">{o.terms}</p>

              <div className="mt-3 flex flex-wrap gap-1.5">
                <Badge tone="neutral">Min spend {rupees(o.min_spend)}</Badge>
                <Badge tone="neutral">Up to {rupees(o.max_off)} off</Badge>
              </div>

              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard?.writeText(o.code).catch(() => undefined);
                  setCopied(o.code);
                  toast(`Code ${o.code} copied`);
                  setTimeout(() => setCopied(null), 1600);
                }}
                className={cx(
                  'mt-4 flex items-center justify-center gap-2 rounded-lg border border-dashed py-2.5',
                  'text-[0.8125rem] font-bold transition-colors',
                  copied === o.code
                    ? 'border-confirmed bg-confirmed-soft text-confirmed-ink'
                    : 'border-line-strong text-navy-700 hover:border-navy-400 hover:bg-navy-50',
                )}
              >
                {copied === o.code ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                Use code: {o.code}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
