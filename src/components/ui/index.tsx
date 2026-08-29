import {
  createContext,
  forwardRef,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronDown, Minus, Plus, X } from 'lucide-react';

type ClassValue = string | number | false | null | undefined;

export function cx(...parts: ClassValue[]): string {
  return parts.filter((p): p is string => typeof p === 'string' && p.length > 0).join(' ');
}

/* ---------------------------------------------------------------- Button */

type ButtonVariant = 'primary' | 'accent' | 'secondary' | 'ghost' | 'danger' | 'success';
type ButtonSize = 'sm' | 'md' | 'lg';

const BUTTON_VARIANT: Record<ButtonVariant, string> = {
  primary: 'bg-navy-700 text-white hover:bg-navy-600 active:bg-navy-800',
  accent: 'bg-saffron-500 text-white hover:bg-saffron-400 active:bg-saffron-600',
  secondary:
    'bg-surface text-navy-700 border border-line-strong hover:border-navy-300 hover:bg-navy-50 shine-dark',
  ghost: 'bg-transparent text-ink-muted hover:bg-navy-50 hover:text-navy-700 shine-dark',
  danger: 'bg-critical text-white hover:brightness-110',
  success: 'bg-confirmed text-white hover:brightness-110',
};

const BUTTON_SIZE: Record<ButtonSize, string> = {
  sm: 'h-9 px-3.5 text-[0.8125rem] gap-1.5',
  md: 'h-11 px-5 text-[0.875rem] gap-2',
  lg: 'h-[3.25rem] px-7 text-[0.9375rem] gap-2.5',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  full?: boolean;
  loading?: boolean;
  icon?: ReactNode;
}

/**
 * Every button carries the hover "shine slide" (§6) — a soft diagonal streak
 * that sweeps across on hover. Light variants get the navy-tinted streak so
 * it stays visible against white.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', full, loading, icon, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cx(
        'shine inline-flex items-center justify-center rounded-lg font-semibold',
        'transition-colors duration-150 ease-rail',
        'disabled:cursor-not-allowed disabled:opacity-45',
        BUTTON_VARIANT[variant],
        BUTTON_SIZE[size],
        full && 'w-full',
        className,
      )}
      {...rest}
    >
      {loading ? (
        <span
          className="h-4 w-4 animate-spin-slow rounded-full border-2 border-current border-t-transparent"
          aria-hidden="true"
        />
      ) : (
        icon
      )}
      {children}
    </button>
  );
});

/* ----------------------------------------------------------------- Input */

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  help?: string;
  error?: string;
  lead?: ReactNode;
  suffix?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, help, error, lead, suffix, className, id, ...rest },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="mb-1.5 block text-[0.8125rem] font-semibold text-ink">
          {label}
        </label>
      )}
      <div className="relative">
        {lead && (
          <span className="pointer-events-none absolute inset-y-0 left-0 grid w-11 place-items-center text-ink-faint">
            {lead}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${inputId}-err` : help ? `${inputId}-help` : undefined}
          className={cx(
            'h-12 w-full rounded-lg border bg-surface px-3.5 text-[0.9375rem] text-ink',
            'placeholder:text-ink-faint transition-colors duration-150',
            'focus:border-navy-500 focus:outline-none focus:ring-2 focus:ring-navy-500/20',
            error ? 'border-critical' : 'border-line-strong',
            lead ? 'pl-11' : '',
            suffix ? 'pr-11' : '',
            className,
          )}
          {...rest}
        />
        {suffix && (
          <span className="absolute inset-y-0 right-0 grid w-11 place-items-center text-ink-faint">
            {suffix}
          </span>
        )}
      </div>
      {error ? (
        <p id={`${inputId}-err`} className="mt-1.5 text-[0.8125rem] text-critical">
          {error}
        </p>
      ) : help ? (
        <p id={`${inputId}-help`} className="mt-1.5 text-[0.8125rem] text-ink-muted">
          {help}
        </p>
      ) : null}
    </div>
  );
});

/* -------------------------------------------------------------- OtpInput */

export function OtpInput({
  label,
  value,
  onChange,
  length = 6,
  autoFocus,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  length?: number;
  autoFocus?: boolean;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const id = useId();

  useEffect(() => {
    if (autoFocus) refs.current[0]?.focus();
  }, [autoFocus]);

  function setAt(i: number, digit: string) {
    const next = value.split('');
    next[i] = digit;
    onChange(next.join('').slice(0, length));
    if (digit && i < length - 1) refs.current[i + 1]?.focus();
  }

  return (
    <div>
      {label && (
        <label htmlFor={`${id}-0`} className="mb-1.5 block text-[0.8125rem] font-semibold text-ink">
          {label}
        </label>
      )}
      <div className="flex gap-2">
        {Array.from({ length }).map((_, i) => (
          <input
            key={i}
            id={`${id}-${i}`}
            ref={(el) => {
              refs.current[i] = el;
            }}
            inputMode="numeric"
            maxLength={1}
            value={value[i] ?? ''}
            aria-label={`Digit ${i + 1}`}
            onChange={(e) => setAt(i, e.target.value.replace(/\D/g, ''))}
            onKeyDown={(e) => {
              if (e.key === 'Backspace' && !value[i] && i > 0) refs.current[i - 1]?.focus();
            }}
            onPaste={(e) => {
              e.preventDefault();
              const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
              if (text) {
                onChange(text);
                refs.current[Math.min(text.length, length - 1)]?.focus();
              }
            }}
            className="tnum h-14 w-full rounded-lg border border-line-strong bg-surface text-center
                       text-xl font-semibold text-ink transition-colors
                       focus:border-navy-500 focus:outline-none focus:ring-2 focus:ring-navy-500/20"
          />
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- Select */

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  help?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, help, className, id, children, ...rest },
  ref,
) {
  const autoId = useId();
  const selectId = id ?? autoId;
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={selectId} className="mb-1.5 block text-[0.8125rem] font-semibold text-ink">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          ref={ref}
          id={selectId}
          className={cx(
            'h-12 w-full appearance-none rounded-lg border border-line-strong bg-surface',
            'px-3.5 pr-10 text-[0.9375rem] text-ink transition-colors',
            'focus:border-navy-500 focus:outline-none focus:ring-2 focus:ring-navy-500/20',
            className,
          )}
          {...rest}
        >
          {children}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint"
          aria-hidden="true"
        />
      </div>
      {help && <p className="mt-1.5 text-[0.8125rem] text-ink-muted">{help}</p>}
    </div>
  );
});

/* --------------------------------------------------------------- Stepper */

export function Stepper({
  label,
  value,
  onChange,
  min = 1,
  max = 6,
  suffix,
}: {
  label?: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  suffix?: string;
}) {
  return (
    <div className="w-full">
      {label && <label className="mb-1.5 block text-[0.8125rem] font-semibold text-ink">{label}</label>}
      <div className="flex h-12 items-center justify-between rounded-lg border border-line-strong bg-surface px-2">
        <button
          type="button"
          aria-label="Decrease"
          disabled={value <= min}
          onClick={() => onChange(Math.max(min, value - 1))}
          className="grid h-8 w-8 place-items-center rounded-md text-navy-700 transition-colors
                     hover:bg-navy-50 disabled:opacity-30"
        >
          <Minus className="h-4 w-4" />
        </button>
        <span className="tnum text-[0.9375rem] font-semibold text-ink">
          {value}
          {suffix ? ` ${suffix}${value === 1 ? '' : 's'}` : ''}
        </span>
        <button
          type="button"
          aria-label="Increase"
          disabled={value >= max}
          onClick={() => onChange(Math.min(max, value + 1))}
          className="grid h-8 w-8 place-items-center rounded-md text-navy-700 transition-colors
                     hover:bg-navy-50 disabled:opacity-30"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ Chip */

export function Chip({
  active,
  selected,
  onClick,
  icon,
  children,
  className,
  tone = 'navy',
}: {
  active?: boolean;
  /** Alias of `active`, kept so earlier screens keep compiling. */
  selected?: boolean;
  onClick?: () => void;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
  tone?: 'navy' | 'saffron';
}) {
  const on = active ?? selected;
  const Tag = onClick ? 'button' : 'span';
  return (
    <Tag
      {...(onClick ? { type: 'button' as const, onClick } : {})}
      className={cx(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5',
        'text-[0.8125rem] font-medium transition-colors duration-150',
        on
          ? tone === 'saffron'
            ? 'border-saffron-500 bg-saffron-500 text-white'
            : 'border-navy-700 bg-navy-700 text-white'
          : 'border-line-strong bg-surface text-ink-muted hover:border-navy-300 hover:bg-navy-50 hover:text-navy-700',
        className,
      )}
    >
      {icon}
      {children}
    </Tag>
  );
}

/* ----------------------------------------------------------------- Badge */

type Tone = 'confirmed' | 'attention' | 'critical' | 'info' | 'neutral' | 'accent';

const TONE_BADGE: Record<Tone, string> = {
  confirmed: 'bg-confirmed-soft text-confirmed-ink',
  attention: 'bg-attention-soft text-attention-ink',
  critical: 'bg-critical-soft text-critical-ink',
  info: 'bg-info-soft text-info-ink',
  neutral: 'bg-surface-tint text-ink-muted',
  accent: 'bg-saffron-50 text-saffron-700',
};

export function Badge({
  tone = 'neutral',
  children,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-md px-2 py-0.5',
        'text-[0.6875rem] font-bold uppercase tracking-[0.04em]',
        TONE_BADGE[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

const TONE_DOT: Record<Tone, string> = {
  confirmed: 'bg-confirmed',
  attention: 'bg-attention',
  critical: 'bg-critical',
  info: 'bg-info',
  neutral: 'bg-ink-faint',
  accent: 'bg-saffron-500',
};

export function StatusDot({ tone }: { tone: Tone }) {
  return <span className={cx('inline-block h-2 w-2 shrink-0 rounded-full', TONE_DOT[tone])} />;
}

/** The pulsing "you are here" dot for the live-status timeline (§6). */
export function LiveDot({ className }: { className?: string }) {
  return (
    <span className={cx('relative grid h-3 w-3 place-items-center', className)}>
      <span className="absolute inset-0 animate-live-pulse rounded-full bg-saffron-500" />
      <span className="relative h-3 w-3 rounded-full border-2 border-saffron-500 bg-white" />
    </span>
  );
}

/* ---------------------------------------------------------------- Toggle */

export function Toggle({
  label,
  help,
  checked,
  onChange,
}: {
  label: string;
  help?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <label htmlFor={id} className="block text-[0.9375rem] font-medium text-ink">
          {label}
        </label>
        {help && <p className="mt-1 text-[0.8125rem] leading-relaxed text-ink-muted">{help}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cx(
          'relative h-7 w-12 shrink-0 rounded-full transition-colors duration-150',
          checked ? 'bg-navy-700' : 'bg-line-strong',
        )}
      >
        <span
          className={cx(
            'absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform duration-150 ease-rail',
            checked ? 'translate-x-6' : 'translate-x-1',
          )}
        />
      </button>
    </div>
  );
}

/* ----------------------------------------------------------------- Modal */

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4">
          <motion.div
            className="absolute inset-0 bg-navy-900/40 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className={cx(
              'relative max-h-[88vh] w-full overflow-y-auto rounded-card bg-surface p-6 shadow-panel',
              wide ? 'max-w-2xl' : 'max-w-md',
            )}
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              {title && <h2 className="text-lg font-bold text-ink">{title}</h2>}
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="-mr-1 -mt-1 ml-auto rounded-md p-1.5 text-ink-faint transition-colors hover:bg-surface-sunk hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {children}
            {footer && <div className="mt-5 border-t border-line pt-4">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/* -------------------------------------------------------- SectionHeading */

export function SectionHeading({
  children,
  action,
  className,
}: {
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx('mb-3 flex items-end justify-between gap-4', className)}>
      <h2 className="text-[1.0625rem] font-bold text-ink">{children}</h2>
      {action}
    </div>
  );
}

/** Standard page title block for every inner screen. */
export function PageHeader({
  title,
  subtitle,
  badge,
  action,
}: {
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-[1.5rem] font-bold leading-tight text-ink">{title}</h1>
          {badge}
        </div>
        {subtitle && <p className="mt-1.5 text-[0.9375rem] text-ink-muted">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}

/* ----------------------------------------------------------------- Alert */

const TONE_ALERT: Record<Tone, string> = {
  confirmed: 'bg-confirmed-soft text-confirmed-ink border-confirmed/20',
  attention: 'bg-attention-soft text-attention-ink border-attention/20',
  critical: 'bg-critical-soft text-critical-ink border-critical/20',
  info: 'bg-info-soft text-info-ink border-info/20',
  neutral: 'bg-surface-sunk text-ink-muted border-line',
  accent: 'bg-saffron-50 text-saffron-700 border-saffron-200',
};

export function Alert({
  tone = 'info',
  icon,
  title,
  children,
  className,
}: {
  tone?: Tone;
  icon?: ReactNode;
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cx(
        'flex gap-3 rounded-lg border p-3.5 text-[0.875rem] leading-relaxed',
        TONE_ALERT[tone],
        className,
      )}
    >
      {icon && <span className="mt-0.5 shrink-0">{icon}</span>}
      <div className="min-w-0">
        {title && <p className="mb-0.5 font-semibold">{title}</p>}
        <div>{children}</div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- Skeleton */

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx('animate-pulse rounded-lg bg-surface-tint', className)} />;
}

/* ------------------------------------------------------------ EmptyState */

export function EmptyState({
  icon,
  art,
  title,
  body,
  action,
}: {
  icon?: ReactNode;
  /** A larger illustration used instead of the icon tile. */
  art?: ReactNode;
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="card grid place-items-center px-6 py-14 text-center">
      {art ?? (icon && <div className="icon-tile mb-4 h-12 w-12">{icon}</div>)}
      <p className="text-[1.0625rem] font-semibold text-ink">{title}</p>
      {body && <p className="mt-2 max-w-sm text-[0.875rem] leading-relaxed text-ink-muted">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ Tabs */

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: { id: T; label: string; count?: number }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div role="tablist" className="mb-5 flex gap-1 border-b border-line">
      {tabs.map((t) => {
        const active = t.id === value;
        return (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(t.id)}
            className={cx(
              'relative -mb-px border-b-2 px-4 py-2.5 text-[0.875rem] font-semibold transition-colors',
              active
                ? 'border-navy-700 text-navy-700'
                : 'border-transparent text-ink-muted hover:text-ink',
            )}
          >
            {t.label}
            {typeof t.count === 'number' && (
              <span
                className={cx(
                  'tnum ml-2 rounded-full px-1.5 py-0.5 text-[0.6875rem] font-bold',
                  active ? 'bg-navy-100 text-navy-700' : 'bg-surface-tint text-ink-faint',
                )}
              >
                {t.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ----------------------------------------------------------------- Toast */

export function Toast({ message, onDone }: { message: string | null; onDone: () => void }) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onDone, 3200);
    return () => clearTimeout(t);
  }, [message, onDone]);

  return (
    <AnimatePresence>
      {message && (
        <motion.div
          role="status"
          className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-lg bg-navy-800 px-4 py-3
                     text-[0.875rem] font-medium text-white shadow-panel"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.18 }}
        >
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ----------------------------------------------------------- Toast queue */

const ToastCtx = createContext<(m: string) => void>(() => undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  return (
    <ToastCtx.Provider value={setMessage}>
      {children}
      <Toast message={message} onDone={() => setMessage(null)} />
    </ToastCtx.Provider>
  );
}

export function useToast() {
  return useContext(ToastCtx);
}

/* -------------------------------------------------------------- IconTile */

export function IconTile({
  icon,
  tone = 'navy',
  size = 'md',
  className,
}: {
  icon: ReactNode;
  tone?: 'navy' | 'saffron' | 'confirmed' | 'info' | 'critical';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const tones = {
    navy: 'bg-navy-50 text-navy-700',
    saffron: 'bg-saffron-50 text-saffron-600',
    confirmed: 'bg-confirmed-soft text-confirmed',
    info: 'bg-info-soft text-info',
    critical: 'bg-critical-soft text-critical',
  };
  const sizes = { sm: 'h-8 w-8', md: 'h-10 w-10', lg: 'h-12 w-12' };
  return (
    <span className={cx('grid shrink-0 place-items-center rounded-tile', tones[tone], sizes[size], className)}>
      {icon}
    </span>
  );
}

/* --------------------------------------------------------------- Tooltip */

/** Lightweight hover tooltip — used to expand "AVL 42" into plain language. */
export function Tooltip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className="group/tip relative inline-flex">
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-1.5 hidden -translate-x-1/2
                   whitespace-nowrap rounded-md bg-navy-800 px-2 py-1 text-[0.75rem] font-medium
                   text-white shadow-lift group-hover/tip:block"
      >
        {label}
      </span>
    </span>
  );
}

/* ------------------------------------------------------------- CheckLine */

export function CheckLine({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-start gap-1.5 text-[0.8125rem] text-ink-muted">
      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-info" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}
