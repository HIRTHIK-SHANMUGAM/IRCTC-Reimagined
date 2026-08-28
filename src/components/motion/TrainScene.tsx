import { motion } from 'framer-motion';
import { usePrefersReducedMotion } from '@/hooks/useReducedMotion';

/**
 * The login motion graphic. Authored SVG, not stock footage — Motion Array has
 * no railway set worth leaning on (see docs/DESIGN_RESEARCH.md).
 *
 * The train holds its position and the world moves past it, which reads as
 * speed far more cheaply than translating a 900-unit-wide group. Four parallax
 * bands at different rates give the depth: hills, treeline, poles, ballast.
 */

const SKY_H = 250;

function Hills({ duration }: { duration: number }) {
  // Two copies laid end to end, translated by exactly one copy width, so the
  // loop has no seam.
  const path =
    'M0 250 C 90 196, 150 214, 232 186 C 318 156, 372 200, 468 178 C 556 158, 604 198, 700 190 L 700 250 Z';
  return (
    <motion.g
      animate={{ x: [0, -700] }}
      transition={{ duration, repeat: Infinity, ease: 'linear' }}
    >
      <path d={path} fill="#CFE3DF" />
      <g transform="translate(700 0)">
        <path d={path} fill="#CFE3DF" />
      </g>
      <g transform="translate(1400 0)">
        <path d={path} fill="#CFE3DF" />
      </g>
    </motion.g>
  );
}

function TreeLine({ duration }: { duration: number }) {
  const trees = [12, 46, 74, 118, 150, 196, 232, 268, 300, 340];
  const clump = (
    <g>
      {trees.map((x, i) => {
        const h = 26 + ((i * 13) % 22);
        return (
          <g key={x}>
            <rect x={x + 5} y={250 - h * 0.32} width="2.5" height={h * 0.32} fill="#0B4F45" opacity="0.5" />
            <ellipse cx={x + 6} cy={250 - h * 0.34} rx={9 + (i % 3) * 2} ry={h * 0.42} fill="#0F5F53" opacity="0.42" />
          </g>
        );
      })}
    </g>
  );
  return (
    <motion.g
      animate={{ x: [0, -380] }}
      transition={{ duration, repeat: Infinity, ease: 'linear' }}
    >
      {clump}
      <g transform="translate(380 0)">{clump}</g>
      <g transform="translate(760 0)">{clump}</g>
      <g transform="translate(1140 0)">{clump}</g>
    </motion.g>
  );
}

function TelegraphPoles({ duration }: { duration: number }) {
  const pole = (
    <g>
      <rect x="0" y="176" width="3" height="76" rx="1.5" fill="#0B4F45" opacity="0.55" />
      <rect x="-9" y="182" width="21" height="2.5" rx="1.25" fill="#0B4F45" opacity="0.55" />
      <rect x="-6" y="192" width="15" height="2" rx="1" fill="#0B4F45" opacity="0.45" />
    </g>
  );
  const spacing = 165;
  return (
    <motion.g
      animate={{ x: [0, -spacing * 3] }}
      transition={{ duration, repeat: Infinity, ease: 'linear' }}
    >
      {Array.from({ length: 12 }, (_, i) => (
        <g key={i} transform={`translate(${i * spacing} 0)`}>
          {pole}
          {/* Catenary sag between poles. */}
          <path
            d={`M3 184 Q ${spacing / 2} 196, ${spacing - 9} 184`}
            fill="none"
            stroke="#0B4F45"
            strokeWidth="1.1"
            opacity="0.35"
          />
        </g>
      ))}
    </motion.g>
  );
}

function Ballast({ duration }: { duration: number }) {
  // Sleepers under the rail. Fastest band — this is what sells the speed.
  const spacing = 26;
  return (
    <motion.g
      animate={{ x: [0, -spacing * 4] }}
      transition={{ duration, repeat: Infinity, ease: 'linear' }}
    >
      {Array.from({ length: 60 }, (_, i) => (
        <rect
          key={i}
          x={i * spacing}
          y="330"
          width="13"
          height="6"
          rx="1.5"
          fill="#0B4F45"
          opacity="0.22"
        />
      ))}
    </motion.g>
  );
}

function Wheel({ cx, cy, r, duration }: { cx: number; cy: number; r: number; duration: number }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill="#083A33" />
      <circle cx={cx} cy={cy} r={r * 0.62} fill="#0F5F53" />
      <motion.g
        style={{ originX: `${cx}px`, originY: `${cy}px` }}
        animate={{ rotate: 360 }}
        transition={{ duration, repeat: Infinity, ease: 'linear' }}
      >
        {/* Spokes — the only way a wheel reads as turning at this size. */}
        {[0, 60, 120].map((deg) => (
          <rect
            key={deg}
            x={cx - r * 0.58}
            y={cy - 1}
            width={r * 1.16}
            height="2"
            rx="1"
            fill="#FBF9F4"
            opacity="0.55"
            transform={`rotate(${deg} ${cx} ${cy})`}
          />
        ))}
      </motion.g>
      <circle cx={cx} cy={cy} r={r * 0.2} fill="#FBF9F4" opacity="0.8" />
    </g>
  );
}

function Coach({ x, windows = 5 }: { x: number; windows?: number }) {
  const w = 176;
  return (
    <g transform={`translate(${x} 0)`}>
      <rect x="0" y="248" width={w} height="70" rx="10" fill="#0B4F45" />
      <rect x="0" y="248" width={w} height="70" rx="10" fill="none" stroke="#083A33" strokeWidth="1.5" />
      {/* Livery stripe — the one warm accent on an otherwise teal body. */}
      <rect x="0" y="292" width={w} height="4" fill="#B8730A" opacity="0.85" />
      {Array.from({ length: windows }, (_, i) => (
        <rect
          key={i}
          x={16 + i * ((w - 30) / windows)}
          y="260"
          width={(w - 30) / windows - 10}
          height="22"
          rx="3.5"
          fill="#FBF9F4"
          opacity="0.9"
        />
      ))}
      {/* Door seams. */}
      <rect x={w - 26} y="256" width="1.4" height="58" fill="#083A33" opacity="0.7" />
      <rect x="20" y="256" width="1.4" height="58" fill="#083A33" opacity="0.7" />
      <Wheel cx={38} cy={326} r={11} duration={0.75} />
      <Wheel cx={72} cy={326} r={11} duration={0.75} />
      <Wheel cx={w - 72} cy={326} r={11} duration={0.75} />
      <Wheel cx={w - 38} cy={326} r={11} duration={0.75} />
    </g>
  );
}

function Locomotive({ x }: { x: number }) {
  return (
    <g transform={`translate(${x} 0)`}>
      {/* Raked nose, like a Vande Bharat set. */}
      <path
        d="M0 318 L0 262 C 0 254, 6 248, 16 248 L 150 248 C 158 248, 164 254, 164 262 L 164 318 Z"
        fill="#0F5F53"
      />
      <path
        d="M0 318 L0 262 C 0 254, 6 248, 16 248 L 40 248 L 20 318 Z"
        fill="#FBF9F4"
        opacity="0.14"
      />
      <rect x="0" y="292" width="164" height="4" fill="#B8730A" opacity="0.85" />
      {/* Cab glass. */}
      <path d="M10 268 L34 254 L58 254 L58 276 L10 276 Z" fill="#FBF9F4" opacity="0.92" />
      {[0, 1, 2].map((i) => (
        <rect key={i} x={74 + i * 28} y="260" width="18" height="20" rx="3.5" fill="#FBF9F4" opacity="0.85" />
      ))}
      {/* Headlamp and its throw. */}
      <circle cx="7" cy="284" r="4" fill="#FBF9F4" />
      <path d="M3 284 L-40 276 L-40 292 Z" fill="#FBF9F4" opacity="0.28" />
      {/* Pantograph. */}
      <path d="M96 248 L104 232 L124 232 L132 248" fill="none" stroke="#083A33" strokeWidth="2.2" strokeLinecap="round" />
      <rect x="100" y="229" width="28" height="3" rx="1.5" fill="#083A33" />
      <Wheel cx={40} cy={326} r={12} duration={0.75} />
      <Wheel cx={78} cy={326} r={12} duration={0.75} />
      <Wheel cx={128} cy={326} r={12} duration={0.75} />
    </g>
  );
}

export function TrainScene({ className = '' }: { className?: string }) {
  const reduced = usePrefersReducedMotion();

  // With reduced motion the scene still renders — it simply holds still.
  const speeds = reduced
    ? { hills: 0, trees: 0, poles: 0, ballast: 0, wheel: 0 }
    : { hills: 42, trees: 16, poles: 7.5, ballast: 1.15, wheel: 0.75 };

  return (
    <div className={className} aria-hidden="true">
      <svg
        viewBox="0 0 1200 400"
        className="h-full w-full"
        preserveAspectRatio="xMidYMax slice"
        role="presentation"
      >
        <defs>
          <linearGradient id="ri-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FBF9F4" />
            <stop offset="55%" stopColor="#EAF3F1" />
            <stop offset="100%" stopColor="#CFE3DF" />
          </linearGradient>
          <linearGradient id="ri-fade" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#FBF9F4" stopOpacity="1" />
            <stop offset="12%" stopColor="#FBF9F4" stopOpacity="0" />
            <stop offset="88%" stopColor="#FBF9F4" stopOpacity="0" />
            <stop offset="100%" stopColor="#FBF9F4" stopOpacity="1" />
          </linearGradient>
          <clipPath id="ri-clip">
            <rect x="0" y="0" width="1200" height="400" />
          </clipPath>
        </defs>

        <g clipPath="url(#ri-clip)">
          <rect x="0" y="0" width="1200" height={SKY_H + 60} fill="url(#ri-sky)" />

          {/* Sun, held still — it is the one fixed thing in the frame. */}
          <circle cx="980" cy="86" r="34" fill="#B8730A" opacity="0.14" />
          <circle cx="980" cy="86" r="20" fill="#B8730A" opacity="0.2" />

          {speeds.hills ? <Hills duration={speeds.hills} /> : <Hills duration={0.0001} />}
          {speeds.trees ? <TreeLine duration={speeds.trees} /> : <TreeLine duration={0.0001} />}
          {speeds.poles ? (
            <TelegraphPoles duration={speeds.poles} />
          ) : (
            <TelegraphPoles duration={0.0001} />
          )}

          {/* Ground. */}
          <rect x="0" y="250" width="1200" height="150" fill="#EAF3F1" />
          <rect x="0" y="336" width="1200" height="64" fill="#F4F1E9" />

          {speeds.ballast ? <Ballast duration={speeds.ballast} /> : <Ballast duration={0.0001} />}

          {/* The rail draws itself in on mount — the line arriving before the train. */}
          <motion.line
            x1="0"
            y1="338"
            x2="1200"
            y2="338"
            stroke="#0B4F45"
            strokeWidth="2.5"
            strokeLinecap="round"
            initial={reduced ? undefined : { pathLength: 0, opacity: 0 }}
            animate={reduced ? undefined : { pathLength: 1, opacity: 0.75 }}
            transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
            opacity={reduced ? 0.75 : undefined}
          />

          {/* The consist. A gentle vertical float stands in for track chatter. */}
          <motion.g
            initial={reduced ? undefined : { x: -140, opacity: 0 }}
            animate={reduced ? undefined : { x: 0, opacity: 1 }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.25 }}
          >
            <motion.g
              animate={reduced ? undefined : { y: [0, -1.2, 0, 1.2, 0] }}
              transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Coach x={640} windows={5} />
              <Coach x={452} windows={5} />
              <Coach x={264} windows={5} />
              <Locomotive x={92} />
            </motion.g>
          </motion.g>

          {/* Soft edges so the scene bleeds into the page rather than ending. */}
          <rect x="0" y="0" width="1200" height="400" fill="url(#ri-fade)" />
        </g>
      </svg>
    </div>
  );
}
