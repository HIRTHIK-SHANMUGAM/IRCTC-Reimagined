import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Languages, Search } from 'lucide-react';
import type { Locale } from '@/types';
import { SUPPORTED_LOCALES, suggestedLocales } from '@/i18n';
import { useSession } from '@/store/session';
import { cx } from '@/components/ui';

/**
 * One switch changes the interface and the railway data together — train and
 * station names are language maps, so they flip in the same tick (§12).
 *
 * The list is long enough now that it gets a filter box, and the languages
 * suggested by the browser and timezone are floated to the top — a location
 * default surfaces a likely choice without ever restricting the rest.
 */
export function LanguageSwitch({ compact }: { compact?: boolean }) {
  const { t, i18n } = useTranslation();
  const setLanguage = useSession((s) => s.setLanguage);
  const [open, setOpen] = useState(false);
  const [dropUp, setDropUp] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const current = (i18n.resolvedLanguage ?? i18n.language ?? 'en').split('-')[0] as Locale;
  const active = SUPPORTED_LOCALES.find((l) => l.code === current) ?? SUPPORTED_LOCALES[0];

  const ordered = useMemo(() => {
    const hints = suggestedLocales();
    const rank = (c: Locale) => {
      const i = hints.indexOf(c);
      return i === -1 ? hints.length + SUPPORTED_LOCALES.findIndex((l) => l.code === c) : i;
    };
    return [...SUPPORTED_LOCALES].sort((a, b) => rank(a.code) - rank(b.code));
  }, []);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ordered;
    return ordered.filter(
      (l) =>
        l.label.toLowerCase().includes(q) ||
        l.native.toLowerCase().includes(q) ||
        l.regions.some((r) => r.toLowerCase().includes(q)),
    );
  }, [ordered, query]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => {
          const rect = ref.current?.getBoundingClientRect();
          // Open upward when there is not enough room below the trigger.
          if (rect) setDropUp(window.innerHeight - rect.bottom < 340);
          setQuery('');
          setOpen((v) => !v);
        }}
        aria-expanded={open}
        aria-label={t('ui.changeLanguage')}
        data-testid="language-switch"
        className={cx(
          'flex items-center gap-2 rounded-lg border border-line px-3 transition-colors hover:bg-navy-50',
          compact ? 'h-10' : 'h-11',
        )}
      >
        <Languages className="h-4 w-4 shrink-0 text-navy-700" aria-hidden="true" />
        <span className="text-[0.8125rem] font-semibold text-ink">{active.native}</span>
      </button>

      {open && (
        <div
          className={cx(
            'absolute right-0 z-40 w-64 animate-rise-in overflow-hidden rounded-card border border-line bg-surface shadow-panel',
            dropUp ? 'bottom-full mb-2' : 'top-full mt-2',
          )}
        >
          <div className="border-b border-line p-2">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-faint"
                aria-hidden="true"
              />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label={t('ui.changeLanguage')}
                placeholder={`${SUPPORTED_LOCALES.length} languages`}
                className="h-9 w-full rounded-md border border-line-strong bg-surface-sunk pl-8 pr-2
                           text-[0.8125rem] text-ink placeholder:text-ink-faint
                           focus:border-navy-500 focus:outline-none focus:ring-2 focus:ring-navy-500/20"
              />
            </div>
          </div>

          <div className="max-h-72 overflow-y-auto p-1.5">
            {shown.length === 0 ? (
              <p className="px-3 py-6 text-center text-[0.8125rem] text-ink-muted">
                No language matches that.
              </p>
            ) : (
              shown.map((l) => (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => {
                    void setLanguage(l.code);
                    setOpen(false);
                  }}
                  className="flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left
                             transition-colors hover:bg-navy-50"
                >
                  <span className="min-w-0">
                    <span
                      className="block truncate font-semibold text-ink"
                      dir={l.rtl ? 'rtl' : undefined}
                    >
                      {l.native}
                    </span>
                    <span className="block truncate text-[0.75rem] text-ink-muted">
                      {l.label}
                      {l.regions.length > 0 && ` · ${l.regions[0]}`}
                    </span>
                  </span>
                  {l.code === current && <Check className="h-4 w-4 shrink-0 text-navy-600" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
