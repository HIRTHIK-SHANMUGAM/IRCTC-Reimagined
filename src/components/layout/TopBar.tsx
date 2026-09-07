import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Bell,
  ChevronDown,
  LogOut,
  Menu,
  Mic,
  Search,
  Ticket,
  User,
  Wallet,
} from 'lucide-react';
import { useSession } from '@/store/session';
import { rupees } from '@/lib/format';
import { LanguageSwitch } from './LanguageSwitch';
import { NotificationPanel } from './NotificationPanel';
import { Badge, cx } from '@/components/ui';

/** Web Speech API, where the browser has it. Absent support is a no-op. */
type SpeechCtor = new () => {
  lang: string;
  interimResults: boolean;
  onresult: ((e: { results: { 0: { 0: { transcript: string } } } }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
};

function speechCtor(): SpeechCtor | null {
  const w = window as unknown as Record<string, SpeechCtor | undefined>;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/**
 * The dashboard top bar (addendum §3): a full-width universal ask box with a
 * voice button, then Alerts, My Bookings, the live eWallet balance and the
 * account chip. The wallet figure is the real persisted balance, so it moves
 * whenever a booking is paid for or the wallet is topped up.
 */
export function TopBar({ onOpenNav }: { onOpenNav: () => void }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useSession((s) => s.user);
  const wallet = useSession((s) => s.wallet);
  const notifications = useSession((s) => s.notifications);
  const signOut = useSession((s) => s.signOut);

  const [ask, setAsk] = useState('');
  const [listening, setListening] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const unread = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [menuOpen]);

  function submitAsk(e: React.FormEvent) {
    e.preventDefault();
    const q = ask.trim();
    if (!q) return;
    navigate(`/assistant?q=${encodeURIComponent(q)}`);
    setAsk('');
  }

  /** Voice input degrades to a disabled-looking no-op where unsupported. */
  function startVoice() {
    const Ctor = speechCtor();
    if (!Ctor) return;
    try {
      const rec = new Ctor();
      rec.lang = 'en-IN';
      rec.interimResults = false;
      rec.onresult = (e) => setAsk(e.results[0][0].transcript);
      rec.onend = () => setListening(false);
      rec.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  }

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur">
      <div className="flex items-center gap-3 px-4 py-3 lg:px-6">
        <button
          type="button"
          onClick={onOpenNav}
          aria-label="Open menu"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-navy-50 hover:text-navy-700 lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* universal ask */}
        <form onSubmit={submitAsk} className="relative min-w-0 flex-1 lg:max-w-2xl">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint"
            aria-hidden="true"
          />
          <input
            value={ask}
            onChange={(e) => setAsk(e.target.value)}
            aria-label={t('ui.askPlaceholder')}
            placeholder={t('ui.askPlaceholder')}
            className="h-11 w-full rounded-full border border-line-strong bg-surface-sunk pl-10 pr-11
                       text-[0.875rem] text-ink placeholder:text-ink-faint transition-colors
                       focus:border-navy-400 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-navy-500/15"
          />
          <button
            type="button"
            onClick={startVoice}
            aria-label={t('ui.searchVoice')}
            className={cx(
              'absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full transition-colors',
              listening ? 'bg-saffron-500 text-white' : 'text-ink-faint hover:bg-navy-50 hover:text-navy-700',
            )}
          >
            <Mic className="h-4 w-4" />
          </button>
        </form>

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <div className="hidden xl:block">
            <LanguageSwitch compact />
          </div>

          {/* alerts */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setBellOpen((v) => !v)}
              aria-label={`${t('ui.alerts')}${unread ? `, ${unread}` : ''}`}
              className="group relative grid h-11 w-11 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-navy-50 hover:text-navy-700"
            >
              <Bell className="h-[1.125rem] w-[1.125rem]" />
              {unread > 0 && (
                <span className="tnum absolute right-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-critical px-1 text-[0.625rem] font-bold text-white">
                  {unread}
                </span>
              )}
              <span className="mt-0.5 hidden text-[0.625rem] font-semibold">{t('ui.alerts')}</span>
            </button>
            <NotificationPanel open={bellOpen} onClose={() => setBellOpen(false)} />
          </div>

          {/* my bookings */}
          <Link
            to="/trips"
            aria-label={t('ui.myBookings')}
            className="hidden h-11 w-11 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-navy-50 hover:text-navy-700 sm:grid"
          >
            <Ticket className="h-[1.125rem] w-[1.125rem]" />
          </Link>

          {/* wallet balance */}
          <Link
            to="/wallet"
            className="lift hidden items-center gap-2 rounded-lg border border-line px-3 py-2 md:flex"
          >
            <Wallet className="h-4 w-4 text-navy-700" aria-hidden="true" />
            <span className="leading-none">
              <span className="block text-[0.625rem] font-semibold text-ink-faint">
                {t('sidebar.wallet')}
              </span>
              <span className="tnum mt-0.5 block text-[0.8125rem] font-bold text-ink">
                {rupees(wallet.balance)}
              </span>
            </span>
          </Link>

          {/* account chip */}
          <div ref={menuRef} className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-expanded={menuOpen}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-navy-50"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-navy-700 text-[0.8125rem] font-bold text-white">
                {(user?.name ?? 'T').charAt(0).toUpperCase()}
              </span>
              <span className="hidden leading-none lg:block">
                <span className="block max-w-[9rem] truncate text-[0.8125rem] font-bold text-ink">
                  {user?.name ?? 'Traveller'}
                </span>
                <span className="mt-1 block text-[0.6875rem] font-medium text-saffron-600">
                  {t('ui.silverMember')}
                </span>
              </span>
              <ChevronDown className="hidden h-4 w-4 text-ink-faint lg:block" aria-hidden="true" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full z-40 mt-2 w-60 animate-rise-in rounded-card border border-line bg-surface p-1.5 shadow-panel">
                <div className="border-b border-line px-3 py-2.5">
                  <p className="truncate text-[0.875rem] font-bold text-ink">{user?.name}</p>
                  <p className="tnum mt-0.5 text-[0.75rem] text-ink-muted">{user?.mobile}</p>
                  <Badge tone="accent" className="mt-2">
                    {t('ui.silverMember')}
                  </Badge>
                </div>
                <Link
                  to="/profile"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2.5 rounded-md px-3 py-2 text-[0.875rem] text-ink-muted transition-colors hover:bg-navy-50 hover:text-navy-700"
                >
                  <User className="h-4 w-4" /> {t('sidebar.profile')}
                </Link>
                <Link
                  to="/wallet"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2.5 rounded-md px-3 py-2 text-[0.875rem] text-ink-muted transition-colors hover:bg-navy-50 hover:text-navy-700"
                >
                  <Wallet className="h-4 w-4" /> {t('sidebar.wallet')} · {rupees(wallet.balance)}
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    void signOut().then(() => navigate('/', { replace: true }));
                  }}
                  className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-[0.875rem] text-ink-muted transition-colors hover:bg-critical-soft hover:text-critical"
                >
                  <LogOut className="h-4 w-4" /> {t('sidebar.logout')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
