import { useState } from 'react';
import { Search, Ticket } from 'lucide-react';
import { useSession } from '@/store/session';
import { useLocalized } from '@/hooks/useLocalized';
import { formatDate, rupees } from '@/lib/format';
import { getStation } from '@/data/stations';
import { Alert, Badge, Button, EmptyState, Input, PageHeader, cx } from '@/components/ui';

type Found =
  | { kind: 'journey'; title: string; subtitle: string; date: string; status: string; rows: [string, string][]; plain: string }
  | { kind: 'booking'; title: string; subtitle: string; date: string; status: string; rows: [string, string][]; plain: string };

/**
 * PNR Enquiry (addendum §5). Reads the status back in plain language —
 * "confirmed, coach B2, seat 42" — rather than leaving the user to decode
 * CNF/RAC/WL themselves (master prompt §8). Accepts any reference across
 * categories, not just train PNRs.
 */
export function PnrEnquiry() {
  const { L } = useLocalized();
  const journeys = useSession((s) => s.journeys);
  const bookings = useSession((s) => s.bookings);

  const [pnr, setPnr] = useState('');
  const [result, setResult] = useState<Found | null>(null);
  const [error, setError] = useState<string | null>(null);

  function lookup(e: React.FormEvent) {
    e.preventDefault();
    const q = pnr.trim().toUpperCase();
    setError(null);
    setResult(null);
    if (!q) return;

    const j = journeys.find((x) => x.pnr.toUpperCase() === q);
    if (j) {
      const p = j.passengers[0];
      setResult({
        kind: 'journey',
        title: `${L(j.train_name)} (${j.train_number})`,
        subtitle: `${L(getStation(j.from_station)?.name)} → ${L(getStation(j.to_station)?.name)}`,
        date: j.journey_date,
        status: j.status,
        rows: [
          ['Class', j.class],
          ['Quota', j.quota],
          ['Coach', p?.coach ?? '—'],
          ['Seat', j.passengers.map((x) => x.seat_number).join(', ') || '—'],
          ['Departs', j.departure_time],
          ['Arrives', j.arrival_time],
          ['Passengers', j.passengers.map((x) => x.name).join(', ')],
          ['Fare paid', rupees(j.total_fare)],
        ],
        plain:
          j.status === 'confirmed'
            ? `Confirmed. ${j.passengers.length} passenger${j.passengers.length === 1 ? '' : 's'} in coach ${p?.coach ?? '—'}, seat ${j.passengers.map((x) => x.seat_number).join(', ')}. Board at ${j.boarding_station ?? j.from_station} by ${j.departure_time}.`
            : j.status === 'RAC'
              ? 'RAC — you can travel. You share a berth for now and usually get a full one before departure.'
              : j.status === 'cancelled'
                ? 'This ticket is cancelled. Your refund has been credited to your eWallet.'
                : 'Waitlisted. If it does not confirm before the chart is prepared, you are refunded automatically.',
      });
      return;
    }

    const b = bookings.find((x) => x.reference.toUpperCase() === q);
    if (b) {
      setResult({
        kind: 'booking',
        title: b.title,
        subtitle: b.subtitle,
        date: b.date,
        status: b.status,
        rows: Object.entries(b.details) as [string, string][],
        plain:
          b.status === 'cancelled'
            ? 'This booking is cancelled. Your refund has been credited to your eWallet.'
            : `Confirmed. Reference ${b.reference}, ${formatDate(b.date)}${b.time ? ` at ${b.time}` : ''}.`,
      });
      return;
    }

    setError(
      'We could not find that reference on your account. Check the digits, or open My Trips to see everything you have booked.',
    );
  }

  const examples = [...journeys.slice(0, 2).map((j) => j.pnr), ...bookings.slice(0, 2).map((b) => b.reference)];

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="PNR Enquiry"
        subtitle="Enter any booking reference and we will read the status back in plain language."
      />

      <form onSubmit={lookup} className="card flex flex-wrap items-end gap-3 p-4 sm:p-5">
        <div className="min-w-[12rem] flex-1">
          <Input
            label="PNR or booking reference"
            value={pnr}
            onChange={(e) => setPnr(e.target.value)}
            placeholder="e.g. 2345678901"
            lead={<Search className="h-4 w-4" />}
            className="tnum"
          />
        </div>
        <Button type="submit" size="lg">
          Check status
        </Button>
      </form>

      {examples.length > 0 && (
        <p className="mt-3 flex flex-wrap items-center gap-2 text-[0.8125rem] text-ink-muted">
          Try one of yours:
          {examples.map((x) => (
            <button
              key={x}
              type="button"
              onClick={() => setPnr(x)}
              className="tnum rounded-md border border-line px-2 py-1 font-semibold text-navy-600 hover:bg-navy-50"
            >
              {x}
            </button>
          ))}
        </p>
      )}

      {error && (
        <Alert tone="attention" className="mt-5">
          {error}
        </Alert>
      )}

      {result && (
        <div className="card mt-5 animate-rise-in p-5">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-4">
            <div className="min-w-0">
              <p className="text-[1.0625rem] font-bold text-ink">{result.title}</p>
              <p className="mt-0.5 text-[0.875rem] text-ink-muted">{result.subtitle}</p>
              <p className="tnum mt-1 text-[0.8125rem] font-semibold text-ink-muted">
                {formatDate(result.date)}
              </p>
            </div>
            <Badge
              tone={
                result.status === 'cancelled'
                  ? 'critical'
                  : result.status === 'confirmed'
                    ? 'confirmed'
                    : 'attention'
              }
            >
              {result.status}
            </Badge>
          </div>

          <p
            className={cx(
              'mt-4 rounded-lg p-4 text-[0.9375rem] leading-relaxed',
              result.status === 'cancelled'
                ? 'bg-critical-soft text-critical-ink'
                : result.status === 'confirmed'
                  ? 'bg-confirmed-soft text-confirmed-ink'
                  : 'bg-attention-soft text-attention-ink',
            )}
          >
            {result.plain}
          </p>

          <dl className="mt-4 grid gap-x-6 gap-y-2.5 sm:grid-cols-2">
            {result.rows.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3 border-b border-line pb-2">
                <dt className="text-[0.8125rem] text-ink-muted">{k}</dt>
                <dd className="tnum text-right text-[0.8125rem] font-semibold text-ink">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {!result && !error && (
        <div className="mt-5">
          <EmptyState
            icon={<Ticket className="h-5 w-5" />}
            title="Nothing looked up yet"
            body="Your ticket reference is on the confirmation screen and in My Trips."
          />
        </div>
      )}
    </div>
  );
}
