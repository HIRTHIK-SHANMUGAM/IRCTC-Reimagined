import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Bell, Clock, MapPin, Radio, Tag } from 'lucide-react';
import type { AppNotification } from '@/types';
import { useSession } from '@/store/session';
import { Badge, cx } from '@/components/ui';

const ICON: Record<string, typeof Bell> = {
  cancelled: AlertTriangle,
  platform_change: MapPin,
  delay: Clock,
  arriving_soon: Radio,
  arrived: MapPin,
  departing: Clock,
  chart_prepared: Bell,
  watch_hit: Bell,
  promo: Tag,
};

const TONE = {
  critical: 'critical',
  important: 'attention',
  useful: 'info',
  marketing: 'neutral',
} as const;

function ago(ts: number): string {
  const m = Math.round((Date.now() - ts) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hr ago`;
  return `${Math.round(h / 24)} d ago`;
}

/**
 * The alerts drawer. Notifications carry a priority tier so a platform change
 * never arrives looking like a promotion (master prompt §9).
 */
export function NotificationPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const notifications = useSession((s) => s.notifications);
  const markRead = useSession((s) => s.markRead);
  const markAllRead = useSession((s) => s.markAllRead);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const unread = notifications.filter((n) => !n.read).length;

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full z-40 mt-2 w-[22rem] max-w-[calc(100vw-2rem)] animate-rise-in
                 overflow-hidden rounded-card border border-line bg-surface shadow-panel"
    >
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <p className="text-[0.9375rem] font-bold text-ink">Alerts</p>
        {unread > 0 && (
          <button
            type="button"
            onClick={() => void markAllRead()}
            className="text-[0.75rem] font-bold text-navy-600 hover:text-navy-700"
          >
            Mark all read
          </button>
        )}
      </div>

      <div className="max-h-[24rem] overflow-y-auto">
        {notifications.length === 0 ? (
          <p className="px-4 py-10 text-center text-[0.875rem] text-ink-muted">
            Nothing needs your attention right now.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {notifications.slice(0, 20).map((n: AppNotification) => {
              const Icon = ICON[n.type] ?? Bell;
              return (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => void markRead(n.id)}
                    className={cx(
                      'flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-sunk',
                      !n.read && 'bg-navy-50/50',
                    )}
                  >
                    <Icon
                      className={cx(
                        'mt-0.5 h-4 w-4 shrink-0',
                        n.priority === 'critical'
                          ? 'text-critical'
                          : n.priority === 'important'
                            ? 'text-attention'
                            : 'text-ink-faint',
                      )}
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-[0.875rem] font-semibold text-ink">{n.title}</span>
                        {!n.read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-navy-600" />}
                      </span>
                      <span className="mt-0.5 block text-[0.8125rem] leading-snug text-ink-muted">
                        {n.body}
                      </span>
                      <span className="mt-1.5 flex items-center gap-2">
                        <Badge tone={TONE[n.priority]}>{n.priority}</Badge>
                        <span className="text-[0.6875rem] text-ink-faint">{ago(n.created_at)}</span>
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="border-t border-line px-4 py-2.5">
        <Link
          to="/live-status"
          onClick={onClose}
          className="text-[0.8125rem] font-bold text-navy-600 hover:text-navy-700"
        >
          Track a train →
        </Link>
      </div>
    </div>
  );
}
