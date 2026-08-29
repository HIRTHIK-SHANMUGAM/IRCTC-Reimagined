import { useEffect, useRef, useState } from 'react';
import { Check, Languages } from 'lucide-react';
import type { Locale } from '@/types';
import { useSession } from '@/store/session';
import { useTranslation } from 'react-i18next';
import { cx } from '@/components/ui';

const LANGUAGES: { id: Locale; label: string; native: string }[] = [
  { id: 'en', label: 'English', native: 'English' },
  { id: 'ta', label: 'Tamil', native: 'தமிழ்' },
  { id: 'hi', label: 'Hindi', native: 'हिन्दी' },
];

/**
 * One switch changes the interface and the railway data together — train and
 * station names are language maps, so they flip in the same tick (§12).
 */
export function LanguageSwitch({ compact }: { compact?: boolean }) {
  const { i18n } = useTranslation();
  const setLanguage = useSession((s) => s.setLanguage);
  const [open, setOpen] = useState(false);
  const [dropUp, setDropUp] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current = (i18n.language?.slice(0, 2) as Locale) || 'en';
  const active = LANGUAGES.find((l) => l.id === current) ?? LANGUAGES[0];

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => {
          const rect = ref.current?.getBoundingClientRect();
          // Open upward when there is not enough room below the trigger.
          if (rect) setDropUp(window.innerHeight - rect.bottom < 200);
          setOpen((v) => !v);
        }}
        aria-expanded={open}
        aria-label="Change language"
        className={cx(
          'flex items-center gap-2 rounded-lg border border-line px-3 transition-colors hover:bg-navy-50',
          compact ? 'h-10' : 'h-11',
        )}
      >
        <Languages className="h-4 w-4 text-navy-700" aria-hidden="true" />
        <span className="text-[0.8125rem] font-semibold text-ink">{active.native}</span>
      </button>

      {open && (
        <div
          className={cx(
            'absolute right-0 z-40 w-44 animate-rise-in rounded-card border border-line bg-surface p-1.5 shadow-panel',
            dropUp ? 'bottom-full mb-2' : 'top-full mt-2',
          )}
        >
          {LANGUAGES.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => {
                void setLanguage(l.id);
                setOpen(false);
              }}
              className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-[0.875rem]
                         text-ink-muted transition-colors hover:bg-navy-50 hover:text-navy-700"
            >
              <span>
                <span className="block font-semibold text-ink">{l.native}</span>
                <span className="block text-[0.75rem]">{l.label}</span>
              </span>
              {l.id === current && <Check className="h-4 w-4 text-navy-600" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
