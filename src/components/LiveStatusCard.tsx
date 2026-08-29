import { Link } from 'react-router-dom';
import { Navigation } from 'lucide-react';
import type { LiveTrain } from '@/hooks/useLiveTrain';
import { getStation } from '@/data/stations';
import { useLocalized } from '@/hooks/useLocalized';
import { LiveDot, cx } from '@/components/ui';

/**
 * The running-status timeline from the reference: a delay headline, then each
 * stop as a dot with its state — departed, where the train is right now
 * (pulsing), or still to come with the expected time.
 */
export function LiveStatusCard({
  live,
  compact,
  showTrackLink = true,
}: {
  live: LiveTrain;
  compact?: boolean;
  showTrackLink?: boolean;
}) {
  const { L } = useLocalized();
  const stops = compact ? pickWindow(live) : live.stops;

  const headline =
    live.status === 'not_started'
      ? 'Yet to depart'
      : live.status === 'arrived'
        ? 'Arrived at destination'
        : live.delay_minutes === 0
          ? 'Running on time'
          : `Running ${live.delay_minutes} mins late`;

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[0.9375rem] font-bold text-ink">
            {L(live.train.name)}{' '}
            <span className="tnum font-semibold text-ink-muted">({live.train.number})</span>
          </p>
          <p
            className={cx(
              'mt-1 text-[0.8125rem] font-bold',
              live.delay_minutes > 0 && live.status === 'running' ? 'text-attention' : 'text-confirmed',
            )}
          >
            {headline}
          </p>
        </div>
        {live.status === 'running' && (
          <span className="tnum shrink-0 rounded-md bg-navy-50 px-2 py-1 text-[0.6875rem] font-bold text-navy-700">
            {live.speed_kmh} km/h
          </span>
        )}
      </div>

      <ol className="mt-4">
        {stops.map((s, i) => {
          const st = getStation(s.station);
          const last = i === stops.length - 1;
          return (
            <li key={`${s.station}-${i}`} className="flex gap-3">
              <span className="flex flex-col items-center">
                {s.state === 'current' ? (
                  <LiveDot />
                ) : (
                  <span
                    className={cx(
                      'mt-0.5 h-3 w-3 rounded-full border-2',
                      s.state === 'departed'
                        ? 'border-confirmed bg-confirmed'
                        : 'border-line-strong bg-surface',
                    )}
                  />
                )}
                {!last && (
                  <span
                    className={cx(
                      'my-0.5 w-0.5 flex-1 rounded',
                      s.state === 'departed' ? 'bg-confirmed/40' : 'bg-line',
                    )}
                  />
                )}
              </span>

              <span className={cx('min-w-0 flex-1', last ? 'pb-0' : 'pb-4')}>
                <span className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <span
                    className={cx(
                      'truncate text-[0.875rem]',
                      s.state === 'current' ? 'font-bold text-ink' : 'font-medium text-ink',
                    )}
                  >
                    {L(st?.name) || s.station}
                  </span>
                  <span className="tnum text-[0.75rem] font-semibold text-ink-muted">{s.scheduled}</span>
                </span>
                <span
                  className={cx(
                    'mt-0.5 block text-[0.75rem] font-semibold',
                    s.state === 'departed'
                      ? 'text-confirmed'
                      : s.delay_minutes > 0
                        ? 'text-attention'
                        : 'text-ink-faint',
                  )}
                >
                  {s.state === 'departed'
                    ? last && live.status === 'arrived'
                      ? 'Arrived'
                      : 'Departed'
                    : s.delay_minutes > 0
                      ? `Expected ${s.expected} · ${s.delay_minutes} mins late`
                      : `Expected ${s.expected}`}
                </span>
              </span>
            </li>
          );
        })}
      </ol>

      {showTrackLink && (
        <Link
          to={`/live-status?train=${live.train.number}`}
          className="mt-4 flex items-center justify-center gap-1.5 rounded-lg border border-line py-2.5
                     text-[0.8125rem] font-bold text-navy-600 transition-colors hover:bg-navy-50"
        >
          <Navigation className="h-3.5 w-3.5" /> Track Live
        </Link>
      )}
    </div>
  );
}

/** For the dashboard card, show the origin, the two stops around the train, and the destination. */
function pickWindow(live: LiveTrain) {
  const { stops, current_index } = live;
  if (stops.length <= 4) return stops;
  const start = Math.max(0, Math.min(current_index - 1, stops.length - 4));
  const window = stops.slice(start, start + 3);
  const last = stops[stops.length - 1];
  return window.some((s) => s.station === last.station) ? window : [...window, last];
}
