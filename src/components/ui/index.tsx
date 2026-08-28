import {
  forwardRef,
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
import { Check, ChevronDown, X } from 'lucide-react';

type ClassValue = string | number | false | null | undefined;

export function cx(...parts: ClassValue[]): string {
  return parts.filter((p): p is string => typeof p === 'string' && p.length > 0).join(' ');
}

/* ---------------------------------------------------------------- Button */

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

const BUTTON_VARIANT: Record<ButtonVariant, string> = {
  // "Tactile, layered press button" — Crimson Plinth, uiverse (see research doc).
  primary:
    'bg-teal-700 text-canvas border border-teal-800 shadow-[0_1px_0_0_#052722] hover:bg-teal-600 active:translate-y-[1px] active:shadow-none',
  secondary:
    'bg-canvas-raised text-ink border border-rule-strong hover:border-ink-faint hover:bg-canvas-sunk active:translate-y-[1px]',
  ghost: 'bg-transparent text-ink-muted border border-transparent hover:bg-canvas-sunk hover:text-ink',
  danger:
    'bg-critical text-white border border-critical-ink shadow-[0_1px_0_0_#6B1712] hover:brightness-110 active:translate-y-[1px] active:shadow-none',
};

const BUTTON_SIZE: Record<ButtonSize, string> = {
  sm: 'h-9 px-3.5 text-sm gap-1.5',
  md: 'h-11 px-5 text-[0.9375rem] gap-2',
  lg: 'h-14 px-7 text-base gap-2.5',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  full?: boolean;
  loading?: boolean;
  icon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', full, loading, icon, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cx(
        'inline-flex items-center justify-center rounded-full font-medium transition-all duration-150 ease-rail',
        'disabled:cursor-not-allowed disabled:opacity-45 disabled:active:translate-y-0',
        BUTTON_VARIANT[variant],
        BUTTON_SIZE[size],
        full && 'w-full',
        className,
      )}
      {...rest}
    >
      {loading ? (
        <span
          className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
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
  suffix?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, help, error, suffix, className, id, ...rest },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="label-ink mb-2 block">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${inputId}-err` : help ? `${inputId}-help` : undefined}
          className={cx(
            'h-12 w-full rounded-xl border bg-canvas-raised px-4 text-[0.9375rem] text-ink',
            'placeholder:text-ink-faint transition-colors duration-150',
            'focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/25',
            error ? 'border-critical' : 'border-rule-strong',
            suffix ? 'pr-12' : '',
            className,
          )}
          {...rest}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint">{suffix}</span>
        )}
      </div>
      {error ? (
        <p id={`${inputId}-err`} role="alert" className="mt-2 text-sm text-critical">
          {error}
        </p>
      ) : help ? (
        <p id={`${inputId}-help`} className="mt-2 text-sm text-ink-faint">
          {help}
        </p>
      ) : null}
    </div>
  );
});

/* ------------------------------------------------- Verification code input */

/**
 * Untitled UI calls this a "verification code input" and it is a real component,
 * not six loose boxes: arrow keys move, backspace walks back, and a pasted code
 * fills every cell at once.
 */
export function OtpInput({
  length = 6,
  value,
  onChange,
  label,
  autoFocus,
}: {
  length?: number;
  value: string;
  onChange: (v: string) => void;
  label?: string;
  autoFocus?: boolean;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const id = useId();

  useEffect(() => {
    if (autoFocus) refs.current[0]?.focus();
  }, [autoFocus]);

  const setAt = (index: number, char: string) => {
    const next = value.split('');
    next[index] = char;
    onChange(next.join('').slice(0, length));
  };

  return (
    <div>
      {label && (
        <span id={id} className="label-ink mb-2 block">
          {label}
        </span>
      )}
      <div className="flex gap-2" role="group" aria-labelledby={label ? id : undefined}>
        {Array.from({ length }, (_, i) => (
          <input
            key={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            inputMode="numeric"
            autoComplete={i === 0 ? 'one-time-code' : 'off'}
            maxLength={1}
            aria-label={`Digit ${i + 1}`}
            value={value[i] ?? ''}
            onChange={(e) => {
              const digit = e.target.value.replace(/\D/g, '').slice(-1);
              if (!digit) return setAt(i, '');
              setAt(i, digit);
              if (i < length - 1) refs.current[i + 1]?.focus();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Backspace' && !value[i] && i > 0) {
                refs.current[i - 1]?.focus();
                setAt(i - 1, '');
              }
              if (e.key === 'ArrowLeft' && i > 0) refs.current[i - 1]?.focus();
              if (e.key === 'ArrowRight' && i < length - 1) refs.current[i + 1]?.focus();
            }}
            onPaste={(e) => {
              e.preventDefault();
              const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
              if (!digits) return;
              onChange(digits);
              refs.current[Math.min(digits.length, length - 1)]?.focus();
            }}
            className={cx(
              'tnum h-14 w-full max-w-[3.25rem] rounded-xl border border-rule-strong bg-canvas-raised',
              'text-center text-xl font-semibold text-ink',
              'focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/25',
            )}
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
  { label, help, className, children, id, ...rest },
  ref,
) {
  const autoId = useId();
  const selectId = id ?? autoId;
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={selectId} className="label-ink mb-2 block">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          ref={ref}
          id={selectId}
          className={cx(
            'h-12 w-full appearance-none rounded-xl border border-rule-strong bg-canvas-raised',
            'px-4 pr-10 text-[0.9375rem] text-ink',
            'focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/25',
            className,
          )}
          {...rest}
        >
          {children}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint"
          aria-hidden="true"
        />
      </div>
      {help && <p className="mt-2 text-sm text-ink-faint">{help}</p>}
    </div>
  );
});

/* ------------------------------------------------------------------ Chip */

export function Chip({
  children,
  selected,
  onClick,
  icon,
  className,
  disabled,
}: {
  children: ReactNode;
  selected?: boolean;
  onClick?: () => void;
  icon?: ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  const Tag = onClick ? 'button' : 'span';
  return (
    <Tag
      {...(onClick ? { type: 'button', onClick, disabled, 'aria-pressed': !!selected } : {})}
      className={cx(
        'inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm transition-all duration-150 ease-rail',
        selected
          ? 'border-teal-700 bg-teal-700 text-canvas'
          : 'border-rule-strong bg-canvas-raised text-ink-muted',
        onClick && !selected && !disabled && 'hover:border-ink-faint hover:text-ink',
        disabled && 'cursor-not-allowed opacity-45',
        className,
      )}
    >
      {icon}
      {children}
      {selected && onClick && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
    </Tag>
  );
}

/* ----------------------------------------------------------------- Badge */

type Tone = 'confirmed' | 'attention' | 'critical' | 'info' | 'neutral';

const TONE_CLASS: Record<Tone, string> = {
  confirmed: 'bg-confirmed-soft text-confirmed-ink border-confirmed/25',
  attention: 'bg-attention-soft text-attention-ink border-attention/25',
  critical: 'bg-critical-soft text-critical-ink border-critical/25',
  info: 'bg-info-soft text-info-ink border-info/25',
  neutral: 'bg-canvas-sunk text-ink-muted border-rule',
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
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-label uppercase',
        TONE_CLASS[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** A status dot carrying the semantic colour without any text weight. */
export function StatusDot({ tone }: { tone: Tone }) {
  const fill: Record<Tone, string> = {
    confirmed: 'bg-confirmed',
    attention: 'bg-attention',
    critical: 'bg-critical',
    info: 'bg-info',
    neutral: 'bg-ink-faint',
  };
  return <span className={cx('inline-block h-2 w-2 rounded-full', fill[tone])} aria-hidden="true" />;
}

/* ------------------------------------------------------------------ Toggle */

export function Toggle({
  checked,
  onChange,
  label,
  help,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  help?: string;
}) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <label htmlFor={id} className="block text-[0.9375rem] font-medium text-ink">
          {label}
        </label>
        {help && <p className="mt-1 text-sm text-ink-faint">{help}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cx(
          'relative h-7 w-12 shrink-0 rounded-full border transition-colors duration-200',
          checked ? 'border-teal-800 bg-teal-700' : 'border-rule-strong bg-canvas-sunk',
        )}
      >
        <motion.span
          className="absolute top-[2px] block h-5 w-5 rounded-full bg-canvas-raised shadow-sm"
          initial={false}
          animate={{ left: checked ? 24 : 2 }}
          transition={{ type: 'spring', stiffness: 500, damping: 32 }}
        />
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ Modal */

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
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
            aria-modal="true"
            aria-label={title}
            className="relative w-full max-w-lg rounded-t-finish border border-rule bg-canvas-raised p-6 sm:rounded-finish"
            initial={{ opacity: 0, y: 24, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.99 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <h2 className="font-display text-2xl leading-tight">{title}</h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="-mr-1 -mt-1 rounded-full p-2 text-ink-faint transition-colors hover:bg-canvas-sunk hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div>{children}</div>
            {footer && <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/* ------------------------------------------------------------------ Misc */

export function SectionHeading({
  children,
  action,
}: {
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-4">
      <h2 className="label-ink">{children}</h2>
      {action}
    </div>
  );
}

export function Alert({
  tone = 'info',
  title,
  children,
  icon,
}: {
  tone?: Tone;
  title?: string;
  children: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className={cx('rounded-card border p-4', TONE_CLASS[tone])}>
      <div className="flex gap-3">
        {icon && <span className="mt-0.5 shrink-0">{icon}</span>}
        <div className="min-w-0">
          {title && <p className="mb-1 font-medium">{title}</p>}
          <div className="text-sm leading-relaxed">{children}</div>
        </div>
      </div>
    </div>
  );
}

/** Loading skeleton with the rail shimmer, never a bare spinner. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cx('relative overflow-hidden rounded-lg bg-canvas-sunk', className)} aria-hidden="true">
      <div className="absolute inset-0 -translate-x-full animate-rail-shimmer bg-gradient-to-r from-transparent via-canvas-raised/70 to-transparent" />
    </div>
  );
}

export function EmptyState({
  title,
  body,
  action,
  art,
}: {
  title: string;
  body?: string;
  action?: ReactNode;
  art?: ReactNode;
}) {
  return (
    <div className="card flex flex-col items-center px-6 py-12 text-center">
      {art}
      <h3 className="mt-4 font-display text-2xl">{title}</h3>
      {body && <p className="mt-2 max-w-sm text-sm text-ink-muted">{body}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

/** Simple tab strip used by Trips and Compare. */
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
    <div className="flex gap-1 border-b border-rule" role="tablist">
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          type="button"
          aria-selected={value === t.id}
          onClick={() => onChange(t.id)}
          className={cx(
            'relative px-4 py-3 text-sm font-medium transition-colors',
            value === t.id ? 'text-ink' : 'text-ink-faint hover:text-ink-muted',
          )}
        >
          {t.label}
          {typeof t.count === 'number' && (
            <span className="tnum ml-1.5 text-ink-faint">{t.count}</span>
          )}
          {value === t.id && (
            <motion.span
              layoutId="tab-underline"
              className="absolute inset-x-2 -bottom-px h-[2px] rounded-full bg-teal-700"
              transition={{ type: 'spring', stiffness: 400, damping: 32 }}
            />
          )}
        </button>
      ))}
    </div>
  );
}

/** Small toast, used for "Saved", "Copied", "Watching". */
export function Toast({ message, onDone }: { message: string | null; onDone: () => void }) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (!message) return;
    setShown(true);
    const t = setTimeout(() => {
      setShown(false);
      setTimeout(onDone, 220);
    }, 2400);
    return () => clearTimeout(t);
  }, [message, onDone]);

  return (
    <AnimatePresence>
      {message && shown && (
        <motion.div
          role="status"
          className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex justify-center px-4 sm:bottom-8"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="rounded-full border border-teal-800 bg-teal-700 px-5 py-2.5 text-sm text-canvas">
            {message}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
