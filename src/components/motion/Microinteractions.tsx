import { motion } from 'framer-motion';
import { usePrefersReducedMotion } from '@/hooks/useReducedMotion';

/**
 * The small motion vocabulary, lifted from the recent.design motion set
 * (docs/DESIGN_RESEARCH.md): a braille-style dot matrix for waiting, a
 * tachometer for live speed, and a dotted countdown ring.
 */

/** "Searching trains…" — the Braille Loader, six dots in a 2×3 matrix. */
export function DotMatrix({ label }: { label?: string }) {
  const reduced = usePrefersReducedMotion();
  const dots = [0, 1, 2, 3, 4, 5];
  return (
    <div className="flex items-center gap-3">
      <div className="grid grid-cols-2 gap-[3px]" aria-hidden="true">
        {dots.map((i) => (
          <motion.span
            key={i}
            className="block h-[5px] w-[5px] rounded-full bg-teal-600"
            animate={reduced ? { opacity: 0.6 } : { opacity: [0.2, 1, 0.2] }}
            transition={{
              duration: 1.1,
              repeat: reduced ? 0 : Infinity,
              delay: i * 0.11,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>
      {label ? (
        <span className="label-ink" role="status">
          {label}
        </span>
      ) : null}
    </div>
  );
}

/** Live speed readout — the Tachometer Component reference. */
export function Tachometer({ kmh, max = 160 }: { kmh: number; max?: number }) {
  const pct = Math.max(0, Math.min(1, kmh / max));
  const angle = -120 + pct * 240;
  return (
    <div className="flex items-center gap-3">
      <svg viewBox="0 0 64 44" className="h-11 w-16" aria-hidden="true">
        <path
          d="M6 38 A 26 26 0 0 1 58 38"
          fill="none"
          stroke="#E2DDD1"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <motion.path
          d="M6 38 A 26 26 0 0 1 58 38"
          fill="none"
          stroke="#0F5F53"
          strokeWidth="4"
          strokeLinecap="round"
          initial={false}
          animate={{ pathLength: pct }}
          transition={{ type: 'spring', stiffness: 90, damping: 18 }}
        />
        <motion.line
          x1="32"
          y1="38"
          x2="32"
          y2="18"
          stroke="#12211E"
          strokeWidth="2"
          strokeLinecap="round"
          style={{ originX: '32px', originY: '38px' }}
          initial={false}
          animate={{ rotate: angle }}
          transition={{ type: 'spring', stiffness: 80, damping: 14 }}
        />
        <circle cx="32" cy="38" r="2.5" fill="#12211E" />
      </svg>
      <div>
        <div className="tnum text-lg font-semibold leading-none">{Math.round(kmh)}</div>
        <div className="label mt-1">km/h</div>
      </div>
    </div>
  );
}

/** Arriving-in timer — the Dotted Countdown reference. */
export function DottedCountdown({
  progress,
  label,
  value,
}: {
  progress: number;
  label: string;
  value: string;
}) {
  const dots = 24;
  const lit = Math.round(Math.max(0, Math.min(1, progress)) * dots);
  return (
    <div className="relative grid h-28 w-28 place-items-center">
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden="true">
        {Array.from({ length: dots }, (_, i) => {
          const a = (i / dots) * Math.PI * 2 - Math.PI / 2;
          const cx = 50 + Math.cos(a) * 42;
          const cy = 50 + Math.sin(a) * 42;
          return (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={i < lit ? 3 : 2}
              fill={i < lit ? '#0F5F53' : '#CFC8B7'}
            />
          );
        })}
      </svg>
      <div className="text-center">
        <div className="tnum text-xl font-semibold leading-none">{value}</div>
        <div className="label mt-1.5">{label}</div>
      </div>
    </div>
  );
}

/** Route progress rail used on trip cards and in Track. */
export function RouteRail({
  progress,
  from,
  to,
  compact = false,
}: {
  progress: number;
  from: string;
  to: string;
  compact?: boolean;
}) {
  const pct = Math.max(0, Math.min(1, progress));
  return (
    <div className="w-full">
      <div className="relative h-[3px] w-full rounded-full bg-rule">
        <motion.div
          className="absolute left-0 top-0 h-full rounded-full bg-teal-600"
          initial={false}
          animate={{ width: `${pct * 100}%` }}
          transition={{ type: 'spring', stiffness: 60, damping: 18 }}
        />
        <span className="absolute -top-[3px] left-0 block h-[9px] w-[9px] rounded-full border-2 border-teal-700 bg-canvas" />
        <span className="absolute -top-[3px] right-0 block h-[9px] w-[9px] rounded-full border-2 border-rule-strong bg-canvas" />
        <motion.span
          className="absolute -top-[5px] block h-[13px] w-[13px] rounded-full border-2 border-canvas bg-teal-700"
          initial={false}
          animate={{ left: `calc(${pct * 100}% - 6px)` }}
          transition={{ type: 'spring', stiffness: 60, damping: 18 }}
        />
      </div>
      {!compact && (
        <div className="mt-2 flex justify-between">
          <span className="label-ink">{from}</span>
          <span className="label-ink">{to}</span>
        </div>
      )}
    </div>
  );
}
