import { cx } from '@/components/ui';

/**
 * The IRCTC emblem + wordmark used in the sidebar and on the login panel
 * (addendum §1): a circular blue ring/shield motif, the bold wordmark, and
 * the "Your journey, simplified" tagline underneath.
 */
export function Logo({
  compact,
  onLight = true,
  className,
}: {
  compact?: boolean;
  /** False when sitting over the login photograph, where text goes white. */
  onLight?: boolean;
  className?: string;
}) {
  return (
    <div className={cx('flex items-center gap-2.5', className)}>
      <svg viewBox="0 0 40 40" className="h-9 w-9 shrink-0" aria-hidden="true">
        <defs>
          <linearGradient id="ri-logo-g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#2c4291" />
            <stop offset="100%" stopColor="#1a2b6d" />
          </linearGradient>
        </defs>
        <circle cx="20" cy="20" r="18.5" fill="none" stroke="url(#ri-logo-g)" strokeWidth="2.5" />
        <path d="M20 5.5 A14.5 14.5 0 0 1 34.5 20 L20 20 Z" fill="#f5821f" opacity="0.9" />
        <path d="M20 34.5 A14.5 14.5 0 0 1 5.5 20 L20 20 Z" fill="#2c4291" opacity="0.9" />
        <circle cx="20" cy="20" r="6.5" fill="#ffffff" />
        <circle cx="20" cy="20" r="3.2" fill="#1a2b6d" />
      </svg>
      {!compact && (
        <div className="min-w-0 leading-none">
          <p
            className={cx(
              'text-[1.0625rem] font-extrabold tracking-tight',
              onLight ? 'text-navy-700' : 'text-white',
            )}
          >
            IRCTC
          </p>
          <p
            className={cx(
              'mt-1 text-[0.6875rem] font-medium',
              onLight ? 'text-ink-faint' : 'text-white/75',
            )}
          >
            Your journey, simplified
          </p>
        </div>
      )}
    </div>
  );
}
