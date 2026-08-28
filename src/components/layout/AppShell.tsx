import { useMemo, useState, type ReactNode } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  Bell,
  Compass,
  Home as HomeIcon,
  MapPin,
  Search,
  Sparkles,
  Ticket,
  User,
} from 'lucide-react';
import { LanguageSwitch } from './LanguageSwitch';
import { NotificationPanel } from './NotificationPanel';
import { UniversalAsk } from './UniversalAsk';
import { useSession } from '@/store/session';
import { cx } from '@/components/ui';

interface NavItem {
  to: string;
  key: 'home' | 'explore' | 'trips' | 'track' | 'you';
  icon: typeof HomeIcon;
  end?: boolean;
}

const NAV: NavItem[] = [
  { to: '/', key: 'home', icon: HomeIcon, end: true },
  { to: '/explore', key: 'explore', icon: Compass },
  { to: '/trips', key: 'trips', icon: Ticket },
  { to: '/track', key: 'track', icon: MapPin },
  { to: '/you', key: 'you', icon: User },
];

/**
 * Desktop is a left rail with a persistent context column — not a stretched
 * phone (master prompt §4). Mobile is a bottom nav with the agent as the
 * raised centre action.
 */
export function AppShell({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const notifications = useSession((s) => s.notifications);
  const user = useSession((s) => s.user);
  const [panelOpen, setPanelOpen] = useState(false);
  const [askOpen, setAskOpen] = useState(false);

  const unread = useMemo(
    () => notifications.filter((n) => !n.read && n.priority !== 'marketing').length,
    [notifications],
  );

  return (
    <div className="min-h-dvh">
      {/* ---------------- desktop rail ---------------- */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-rule bg-canvas px-4 py-6 lg:flex">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="mb-8 px-3 text-left"
          aria-label={t('brand')}
        >
          <span className="block font-display text-2xl leading-none">{t('brand')}</span>
          <span className="label mt-1.5 block">{t('tagline')}</span>
        </button>

        <nav className="flex flex-col gap-1" aria-label="Primary">
          {NAV.map(({ to, key, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cx(
                  'relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[0.9375rem] transition-colors',
                  isActive ? 'bg-canvas-sunk font-medium text-ink' : 'text-ink-muted hover:bg-canvas-sunk hover:text-ink',
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span
                      layoutId="rail-active"
                      className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-teal-700"
                      transition={{ type: 'spring', stiffness: 400, damping: 34 }}
                    />
                  )}
                  <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                  {t(`nav.${key}`)}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <button
          type="button"
          onClick={() => navigate('/book')}
          className="mt-6 flex items-center gap-2.5 rounded-xl border border-teal-800 bg-teal-700 px-4 py-3 text-left text-[0.9375rem] font-medium text-canvas transition-colors hover:bg-teal-600"
        >
          <Sparkles className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
          {t('nav.book')}
        </button>

        <div className="mt-auto space-y-3 pt-6">
          <LanguageSwitch />
          {user && (
            <button
              type="button"
              onClick={() => navigate('/you')}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-canvas-sunk"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-teal-700 font-medium text-canvas">
                {user.name.charAt(0).toUpperCase()}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{user.name}</span>
                <span className="label block">{user.mobile}</span>
              </span>
            </button>
          )}
        </div>
      </aside>

      {/* ---------------- top bar ---------------- */}
      <header className="sticky top-0 z-20 border-b border-rule bg-canvas/85 backdrop-blur-md lg:pl-60">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
          <span className="font-display text-xl lg:hidden">{t('brand')}</span>

          <button
            type="button"
            onClick={() => setAskOpen(true)}
            className="ml-auto flex h-10 flex-1 items-center gap-2.5 rounded-full border border-rule-strong bg-canvas-raised px-4 text-left text-sm text-ink-faint transition-colors hover:border-ink-faint lg:ml-0 lg:max-w-md"
          >
            <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="truncate">{t('home.askPlaceholder')}</span>
          </button>

          <div className="ml-auto flex items-center gap-2">
            <div className="hidden lg:block" />
            <button
              type="button"
              onClick={() => setPanelOpen(true)}
              aria-label={t('notifications.title')}
              className="relative grid h-10 w-10 place-items-center rounded-full border border-rule-strong bg-canvas-raised text-ink-muted transition-colors hover:border-ink-faint hover:text-ink"
            >
              <Bell className="h-4 w-4" aria-hidden="true" />
              {unread > 0 && (
                <span className="tnum absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-critical px-1 text-[0.625rem] font-semibold text-white">
                  {unread}
                </span>
              )}
            </button>
            <div className="lg:hidden">
              <LanguageSwitch compact />
            </div>
          </div>
        </div>
      </header>

      {/* ---------------- content ---------------- */}
      <div className="lg:pl-60">
        <div
          className={cx(
            'mx-auto max-w-6xl px-4 pb-28 pt-6 sm:px-6 lg:pb-12',
            aside && 'xl:grid xl:grid-cols-[1fr_20rem] xl:gap-8',
          )}
        >
          {/* A keyed enter transition, deliberately NOT wrapped in
              AnimatePresence: `mode="wait"` there remounts the whole route
              subtree whenever this shell re-renders for an unrelated reason
              (a notification arriving, say), which throws away in-progress
              form and conversation state. A stable key remounts only on real
              navigation, and skipping the exit animation keeps navigation
              instant — which matters most in the Tatkal flow. */}
          <motion.main
            key={location.pathname}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="min-w-0"
          >
            {children}
          </motion.main>

          {/* Persistent selected-journey column — desktop only. */}
          {aside && <div className="hidden xl:block">{aside}</div>}
        </div>
      </div>

      {/* ---------------- mobile bottom nav ---------------- */}
      <nav
        className="safe-b fixed inset-x-0 bottom-0 z-30 border-t border-rule bg-canvas/95 backdrop-blur-md lg:hidden"
        aria-label="Primary"
      >
        <div className="mx-auto grid max-w-lg grid-cols-5 items-end px-2 pt-1.5">
          {NAV.slice(0, 2).map(({ to, key, icon: Icon, end }) => (
            <BottomLink key={to} to={to} label={t(`nav.${key}`)} Icon={Icon} end={end} />
          ))}

          <button
            type="button"
            onClick={() => navigate('/book')}
            className="mx-auto -mt-5 grid h-14 w-14 place-items-center rounded-full border border-teal-800 bg-teal-700 text-canvas shadow-[0_2px_0_0_#052722] transition-transform active:translate-y-[1px]"
            aria-label={t('nav.book')}
          >
            <Sparkles className="h-5 w-5" aria-hidden="true" />
          </button>

          {NAV.slice(3).map(({ to, key, icon: Icon }) => (
            <BottomLink key={to} to={to} label={t(`nav.${key}`)} Icon={Icon} />
          ))}
        </div>
      </nav>

      <NotificationPanel open={panelOpen} onClose={() => setPanelOpen(false)} />
      <UniversalAsk open={askOpen} onClose={() => setAskOpen(false)} />
    </div>
  );
}

function BottomLink({
  to,
  label,
  Icon,
  end,
}: {
  to: string;
  label: string;
  Icon: typeof HomeIcon;
  end?: boolean;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cx(
          'flex flex-col items-center gap-1 rounded-lg px-1 py-2 text-[0.6875rem] transition-colors',
          isActive ? 'text-teal-700' : 'text-ink-faint',
        )
      }
    >
      <Icon className="h-5 w-5" aria-hidden="true" />
      <span className="truncate">{label}</span>
    </NavLink>
  );
}
