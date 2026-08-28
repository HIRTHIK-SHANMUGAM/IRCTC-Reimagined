import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Compass, MapPin, Search, Sparkles, Ticket } from 'lucide-react';
import { classifyIntent, extractTrainNumber } from '@/engine/intent';
import { cx } from '@/components/ui';

const EXAMPLES = [
  'Bangalore tomorrow morning under ₹1000',
  'Chennai to Madurai on Friday, 2 people',
  'where is 12007',
  'Naalaiku morning Chennai la irundhu Madurai poganum',
];

/**
 * The universal ask bar. One mental model: you type what you want, and it
 * routes — a PNR-shaped string to a booking, "where is 12007" to Track,
 * anything journey-shaped to the agent (master prompt §3).
 */
export function UniversalAsk({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [value, setValue] = useState('');

  useEffect(() => {
    if (!open) setValue('');
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const intent = value.trim() ? classifyIntent(value) : null;

  const route = () => {
    const text = value.trim();
    if (!text) return;
    switch (classifyIntent(text)) {
      case 'track_train': {
        const number = extractTrainNumber(text);
        navigate(number ? `/track?train=${number}` : '/track');
        break;
      }
      case 'pnr_status':
      case 'cancel_booking':
        navigate('/trips');
        break;
      case 'explore':
        navigate('/explore');
        break;
      default:
        navigate(`/book?q=${encodeURIComponent(text)}`);
    }
    onClose();
  };

  const hint =
    intent === 'track_train'
      ? { Icon: MapPin, label: 'Live running status' }
      : intent === 'pnr_status' || intent === 'cancel_booking'
        ? { Icon: Ticket, label: 'Your trips' }
        : intent === 'explore'
          ? { Icon: Compass, label: 'Explore destinations' }
          : intent
            ? { Icon: Sparkles, label: 'Ask IRCTC RI' }
            : null;

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh]">
          <motion.div
            className="absolute inset-0 bg-ink/25 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-label={t('home.askTitle')}
            className="relative w-full max-w-xl overflow-hidden rounded-finish border border-rule bg-canvas-raised"
            initial={{ opacity: 0, y: -12, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.99 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                route();
              }}
              className="flex items-center gap-3 border-b border-rule px-5 py-4"
            >
              <Search className="h-5 w-5 shrink-0 text-ink-faint" aria-hidden="true" />
              {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
              <input
                autoFocus
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={t('home.askPlaceholder')}
                aria-label={t('home.askTitle')}
                className="min-w-0 flex-1 bg-transparent text-[1.0625rem] text-ink outline-none placeholder:text-ink-faint"
              />
              {value.trim() && (
                <button
                  type="submit"
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-teal-700 text-canvas"
                  aria-label={t('common.search')}
                >
                  <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </form>

            {hint ? (
              <button
                type="button"
                onClick={route}
                className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-canvas-sunk"
              >
                <hint.Icon className="h-4 w-4 text-teal-700" aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate text-sm">{value}</span>
                <span className="label shrink-0">{hint.label}</span>
              </button>
            ) : (
              <div className="p-5">
                <p className="label mb-3">{t('agent.examples')}</p>
                <ul className="space-y-1">
                  {EXAMPLES.map((ex) => (
                    <li key={ex}>
                      <button
                        type="button"
                        onClick={() => setValue(ex)}
                        className={cx(
                          'w-full rounded-lg px-3 py-2.5 text-left text-sm text-ink-muted',
                          'transition-colors hover:bg-canvas-sunk hover:text-ink',
                        )}
                      >
                        {ex}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
