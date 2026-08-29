import { useEffect, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

/**
 * The application frame: fixed sidebar on desktop, a slide-over drawer on
 * small screens, and the top bar above a scrolling main column.
 *
 * The main element keeps a stable key across re-renders and only animates on
 * an actual path change — remounting it on every store update would throw away
 * in-flight screen state (the Assistant conversation, most visibly).
 */
export function AppShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = navOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [navOpen]);

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[16rem_1fr]">
      {/* desktop rail */}
      <aside className="sticky top-0 hidden h-dvh border-r border-line lg:block">
        <Sidebar />
      </aside>

      {/* mobile drawer */}
      <AnimatePresence>
        {navOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div
              className="absolute inset-0 bg-navy-900/45"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => setNavOpen(false)}
            />
            <motion.div
              className="absolute inset-y-0 left-0 w-[17rem] max-w-[85vw] shadow-panel"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
              <button
                type="button"
                onClick={() => setNavOpen(false)}
                aria-label="Close menu"
                className="absolute right-3 top-4 z-10 grid h-8 w-8 place-items-center rounded-lg text-ink-muted hover:bg-navy-50"
              >
                <X className="h-4 w-4" />
              </button>
              <Sidebar onNavigate={() => setNavOpen(false)} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-col">
        <TopBar onOpenNav={() => setNavOpen(true)} />
        <motion.main
          key="ri-main"
          className="min-w-0 flex-1 px-4 py-6 lg:px-6 lg:py-7"
          initial={false}
          animate={{ opacity: 1 }}
        >
          {children}
        </motion.main>
      </div>
    </div>
  );
}
