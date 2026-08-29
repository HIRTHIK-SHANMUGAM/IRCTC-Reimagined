import { NavLink, useNavigate } from 'react-router-dom';
import { NAV } from '@/nav';
import { useSession } from '@/store/session';
import { Logo } from './Logo';
import { cx } from '@/components/ui';

/**
 * The fixed left sidebar from the reference (addendum §3): logo block, then
 * grouped nav with section labels. The active row is a solid navy block with
 * white text; Assistant is called out in orange as the AI entry point.
 */
export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const navigate = useNavigate();
  const signOut = useSession((s) => s.signOut);

  return (
    <nav className="flex h-full flex-col bg-surface" aria-label="Main">
      <div className="shrink-0 border-b border-line px-5 py-3.5">
        <Logo />
      </div>

      <div className="no-scrollbar flex-1 overflow-y-auto px-3 pb-6">
        {NAV.map((group, gi) => (
          <div key={group.title ?? `g${gi}`}>
            {group.title && <p className="nav-section">{group.title}</p>}
            {gi === 0 && <div className="pt-2.5" />}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;

                if (item.to === 'logout') {
                  return (
                    <li key="logout">
                      <button
                        type="button"
                        onClick={() => {
                          onNavigate?.();
                          void signOut().then(() => navigate('/', { replace: true }));
                        }}
                        className="nav-item w-full text-left hover:bg-critical-soft hover:text-critical"
                      >
                        <Icon className="h-[1.0625rem] w-[1.0625rem] shrink-0" aria-hidden="true" />
                        <span className="truncate">{item.label}</span>
                      </button>
                    </li>
                  );
                }

                return (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.to === '/'}
                      onClick={onNavigate}
                      className={({ isActive }) =>
                        cx(
                          'nav-item',
                          isActive && 'nav-item-active',
                          !isActive && item.accent && 'text-saffron-600 hover:bg-saffron-50 hover:text-saffron-700',
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <Icon
                            className={cx(
                              'h-[1.0625rem] w-[1.0625rem] shrink-0',
                              !isActive && item.accent && 'text-saffron-500',
                            )}
                            aria-hidden="true"
                          />
                          <span className="truncate">{item.label}</span>
                        </>
                      )}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      {/* Support prompt, pinned to the bottom as in the reference */}
      <div className="shrink-0 border-t border-line p-3">
        <div className="rounded-card bg-navy-50 p-3.5">
          <p className="text-[0.8125rem] font-bold text-navy-700">Need Help?</p>
          <p className="mt-1 text-[0.75rem] leading-snug text-ink-muted">
            Talk to our support team for quick resolution.
          </p>
          <NavLink
            to="/support"
            onClick={onNavigate}
            className="mt-3 inline-flex items-center gap-1 text-[0.75rem] font-bold text-saffron-600 hover:text-saffron-700"
          >
            Contact Support →
          </NavLink>
        </div>
      </div>
    </nav>
  );
}
