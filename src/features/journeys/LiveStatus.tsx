import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Radio, Search } from 'lucide-react';
import { TRAINS, getTrain } from '@/data/trains';
import { getStation } from '@/data/stations';
import { useSession } from '@/store/session';
import { useLiveTrain } from '@/hooks/useLiveTrain';
import { useLocalized } from '@/hooks/useLocalized';
import { todayISO } from '@/lib/format';
import { LiveStatusCard } from '@/components/LiveStatusCard';
import { Alert, Badge, Button, Chip, EmptyState, Input, PageHeader } from '@/components/ui';

/**
 * Live Status (addendum §5). Tracks any train by number, whether or not the
 * user has a ticket on it, and defaults to their own active journey. The
 * position advances on an interval — this is a simulation, and it says so.
 */
export function LiveStatus() {
  const { L } = useLocalized();
  const [params, setParams] = useSearchParams();
  const journeys = useSession((s) => s.journeys);

  const myTrains = useMemo(
    () =>
      journeys
        .filter((j) => j.status !== 'cancelled' && j.journey_date >= todayISO())
        .map((j) => ({ number: j.train_number, date: j.journey_date })),
    [journeys],
  );

  const [query, setQuery] = useState(params.get('train') ?? myTrains[0]?.number ?? '12608');
  const [number, setNumber] = useState(query);
  const [date, setDate] = useState(myTrains[0]?.date ?? todayISO());

  useEffect(() => {
    const t = params.get('train');
    if (t) {
      setQuery(t);
      setNumber(t);
    }
  }, [params]);

  const train = getTrain(number);
  const live = useLiveTrain(train, date);

  const suggestions = TRAINS.slice(0, 6);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Live Status"
        subtitle="Where a train is right now, and what that means for the stop you care about."
      />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setNumber(query.trim());
          setParams({ train: query.trim() }, { replace: true });
        }}
        className="card flex flex-wrap items-end gap-3 p-4 sm:p-5"
      >
        <div className="min-w-[12rem] flex-1">
          <Input
            label="Train number or name"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. 12608"
            lead={<Search className="h-4 w-4" />}
            className="tnum"
          />
        </div>
        <div>
          <label htmlFor="ls-date" className="mb-1.5 block text-[0.8125rem] font-semibold text-ink">
            Journey date
          </label>
          <input
            id="ls-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="tnum h-12 rounded-lg border border-line-strong bg-surface px-3.5 text-[0.9375rem] text-ink
                       focus:border-navy-500 focus:outline-none focus:ring-2 focus:ring-navy-500/20"
          />
        </div>
        <Button type="submit" size="lg">
          Track
        </Button>
      </form>

      {myTrains.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-[0.8125rem] font-semibold text-ink-muted">Your journeys:</span>
          {myTrains.map((t) => (
            <Chip
              key={t.number}
              active={number === t.number}
              onClick={() => {
                setQuery(t.number);
                setNumber(t.number);
                setDate(t.date);
              }}
            >
              {t.number}
            </Chip>
          ))}
        </div>
      )}

      {!train ? (
        <div className="mt-5">
          <EmptyState
            icon={<Radio className="h-5 w-5" />}
            title={`No train matches "${number}"`}
            body="Enter a five-digit train number. Try one of these:"
            action={
              <div className="flex flex-wrap justify-center gap-2">
                {suggestions.map((t) => (
                  <Chip
                    key={t.id}
                    onClick={() => {
                      setQuery(t.number);
                      setNumber(t.number);
                    }}
                  >
                    {t.number} · {L(t.name)}
                  </Chip>
                ))}
              </div>
            }
          />
        </div>
      ) : (
        live && (
          <>
            <div className="card mt-5 p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
                <div className="min-w-0">
                  <p className="text-[1.0625rem] font-bold text-ink">{L(train.name)}</p>
                  <p className="tnum mt-0.5 text-[0.8125rem] text-ink-muted">
                    {train.number} · {L(getStation(train.from_station)?.name)} →{' '}
                    {L(getStation(train.to_station)?.name)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Badge tone={live.status === 'running' ? 'confirmed' : 'neutral'}>
                    {live.status === 'running'
                      ? 'Running'
                      : live.status === 'arrived'
                        ? 'Arrived'
                        : 'Not started'}
                  </Badge>
                  {live.status === 'running' && (
                    <Badge tone="info">Platform {live.platform}</Badge>
                  )}
                </div>
              </div>

              {/* progress rail */}
              <div className="mb-5">
                <div className="h-2 overflow-hidden rounded-full bg-surface-tint">
                  <div
                    className="h-full rounded-full bg-navy-600 transition-all duration-700"
                    style={{ width: `${Math.round(live.progress * 100)}%` }}
                  />
                </div>
                <p className="tnum mt-1.5 text-[0.75rem] text-ink-muted">
                  {Math.round(live.progress * 100)}% of the route covered
                </p>
              </div>

              <LiveStatusCard live={live} showTrackLink={false} />
            </div>

            <Alert tone="neutral" className="mt-4">
              Positions are simulated from the timetable for this demonstration build and refresh every
              few seconds. They are not a feed from Indian Railways.
            </Alert>
          </>
        )
      )}
    </div>
  );
}
