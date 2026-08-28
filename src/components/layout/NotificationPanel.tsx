import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Bell, CheckCheck, Info, TriangleAlert, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { AppNotification } from '@/types';
import { useSession, upcomingJourneys } from '@/store/session';
import { Badge, Button, cx } from '@/components/ui';

const PRIORITY_META = {
  critical: { tone: 'critical', Icon: TriangleAlert },
  important: { tone: 'attention', Icon: AlertTriangle },
  useful: { tone: 'info', Icon: Info },
  marketing: { tone: 'neutral', Icon: Bell },
} as const;

function timeAgo(ts: number): string {
  const mins = Math.round((Date.now() - ts) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

export function NotificationPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const notifications = useSession((s) => s.notifications);
  const journeys = useSession((s) => s.journeys);
  const markRead = useSession((s) => s.markRead);
  const markAllRead = useSession((s) => s.markAllRead);

  // No marketing during an active journey. The system knows you are travelling
  // and stays quiet except for what matters (master prompt §9).
  const travelling = upcomingJourneys(journeys).some((j) => j.journey_date <= new Date().toISOString().slice(0, 10));
  const visible = notifications.filter((n) => !(travelling && n.priority === 'marketing'));

  const onOpen = (n: AppNotification) => {
    void markRead(n.id);
    if (n.journey_id) navigate(`/trips?journey=${n.journey_id}`);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50">
          <motion.div
            className="absolute inset-0 bg-ink/20 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
          />
          <motion.aside
            role="dialog"
            aria-label={t('notifications.title')}
            className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-rule bg-canvas"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            <header className="flex items-center justify-between border-b border-rule px-5 py-4">
              <h2 className="font-display text-2xl">{t('notifications.title')}</h2>
              <button
                type="button"
                onClick={onClose}
                aria-label={t('common.close')}
                className="rounded-full p-2 text-ink-faint transition-colors hover:bg-canvas-sunk hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto">
              {visible.length === 0 ? (
                <div className="px-5 py-16 text-center">
                  <CheckCheck className="mx-auto h-8 w-8 text-ink-faint" aria-hidden="true" />
                  <p className="mt-4 text-ink-muted">{t('notifications.empty')}</p>
                </div>
              ) : (
                <ul>
                  {visible.map((n) => {
                    const meta = PRIORITY_META[n.priority];
                    return (
                      <li key={n.id}>
                        <button
                          type="button"
                          onClick={() => onOpen(n)}
                          className={cx(
                            'flex w-full gap-3 border-b border-rule px-5 py-4 text-left transition-colors hover:bg-canvas-sunk',
                            !n.read && 'bg-canvas-raised',
                          )}
                        >
                          <meta.Icon
                            className={cx(
                              'mt-0.5 h-4 w-4 shrink-0',
                              n.priority === 'critical'
                                ? 'text-critical'
                                : n.priority === 'important'
                                  ? 'text-attention'
                                  : 'text-info',
                            )}
                            aria-hidden="true"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <p className={cx('text-[0.9375rem]', !n.read && 'font-medium')}>{n.title}</p>
                              {!n.read && <span className="mt-2 block h-2 w-2 shrink-0 rounded-full bg-teal-700" />}
                            </div>
                            <p className="mt-1 text-sm leading-snug text-ink-muted">{n.body}</p>
                            <div className="mt-2 flex items-center gap-2">
                              <Badge tone={meta.tone}>{t(`notifications.${n.priority}`, n.priority)}</Badge>
                              <span className="label">{timeAgo(n.created_at)}</span>
                            </div>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {visible.some((n) => !n.read) && (
              <div className="border-t border-rule p-4">
                <Button variant="secondary" full onClick={() => void markAllRead()}>
                  {t('notifications.markAllRead')}
                </Button>
              </div>
            )}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
