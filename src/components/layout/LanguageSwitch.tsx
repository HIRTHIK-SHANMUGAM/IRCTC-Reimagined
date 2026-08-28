import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Globe } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Locale } from '@/types';
import { SUPPORTED_LOCALES, suggestedLocales } from '@/i18n';
import { useSession } from '@/store/session';
import { cx } from '@/components/ui';

/**
 * One click, and both the UI *and* the railway data change language (§12).
 * Location suggests the two prominent options — the local language and English —
 * but every supported language stays in the list. A default must never restrict.
 */
export function LanguageSwitch({ compact = false }: { compact?: boolean }) {
  const { i18n } = useTranslation();
  const setLanguage = useSession((s) => s.setLanguage);
  const [open, setOpen] = useState(false);
  // The rail instance sits at the bottom of a full-height column, so a menu
  // that always drops downwards falls off the screen. Flip when there is no
  // room below.
  const [dropUp, setDropUp] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const current = (i18n.resolvedLanguage ?? 'en').split('-')[0] as Locale;
  const suggested = suggestedLocales();

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const ordered = [
    ...SUPPORTED_LOCALES.filter((l) => suggested.includes(l.code)),
    ...SUPPORTED_LOCALES.filter((l) => !suggested.includes(l.code)),
  ];

  return (
    <div ref={ref} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          const rect = triggerRef.current?.getBoundingClientRect();
          const MENU_HEIGHT = 260;
          setDropUp(Boolean(rect && rect.bottom + MENU_HEIGHT > window.innerHeight));
          setOpen((v) => !v);
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Change language"
        className={cx(
          'inline-flex items-center gap-2 rounded-full border border-rule-strong bg-canvas-raised',
          'text-sm text-ink-muted transition-colors hover:border-ink-faint hover:text-ink',
          compact ? 'h-9 px-3' : 'h-10 px-4',
        )}
      >
        <Globe className="h-4 w-4" aria-hidden="true" />
        <span>{SUPPORTED_LOCALES.find((l) => l.code === current)?.native ?? 'English'}</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            role="listbox"
            initial={{ opacity: 0, y: dropUp ? 4 : -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: dropUp ? 4 : -4, scale: 0.98 }}
            transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className={cx(
              'absolute right-0 z-50 w-56 overflow-hidden rounded-card border border-rule bg-canvas-raised py-1.5',
              dropUp ? 'bottom-full mb-2' : 'top-full mt-2',
            )}
          >
            {ordered.map((l, i) => (
              <li key={l.code}>
                <button
                  type="button"
                  role="option"
                  aria-selected={current === l.code}
                  onClick={() => {
                    void setLanguage(l.code);
                    setOpen(false);
                  }}
                  className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm transition-colors hover:bg-canvas-sunk"
                >
                  <span>
                    <span className="block">{l.native}</span>
                    <span className="label">{l.label}</span>
                  </span>
                  {current === l.code && <Check className="h-4 w-4 text-teal-700" aria-hidden="true" />}
                </button>
                {/* Hairline under the two location-suggested options. */}
                {i === suggested.length - 1 && <div className="my-1.5 border-t border-rule" />}
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
