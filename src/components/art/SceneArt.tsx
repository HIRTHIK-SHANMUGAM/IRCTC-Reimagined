import type { Scene } from '@/data/catalog';
import { cx } from '@/components/ui';

/**
 * Destination artwork for recommendation cards, package tiles, hotel listings
 * and activity cards (addendum §7). Each scene is a drawn silhouette over a
 * time-of-day gradient rather than a photograph — it keeps the catalogue
 * consistent, weightless and correctly licensed, and it scales to any tile.
 *
 * Deliberately absent from transactional screens: results tables, booking
 * forms, payment and PNR views stay data-forward with no imagery.
 */

const SKY: Record<Scene, [string, string, string]> = {
  temple: ['#f7b267', '#e8763a', '#7b2d26'],
  beach: ['#7fd8e8', '#3aa8c9', '#12556e'],
  hills: ['#a8d5a2', '#4e9c72', '#1f4d3d'],
  city: ['#8fa8d8', '#4a63a5', '#1c2a52'],
  heritage: ['#f2d194', '#d99a52', '#7a4a1f'],
  backwater: ['#a5dfc4', '#3fa383', '#134f42'],
  desert: ['#fbd38d', '#e09343', '#8a4b1a'],
  rail: ['#b8c6e8', '#5f78b5', '#232f57'],
};

export function SceneArt({ scene, className }: { scene: Scene; className?: string }) {
  const [top, mid, deep] = SKY[scene];
  const id = `sc-${scene}`;

  return (
    <svg
      viewBox="0 0 320 200"
      preserveAspectRatio="xMidYMid slice"
      className={cx('h-full w-full', className)}
      aria-hidden="true"
      role="presentation"
    >
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={top} />
          <stop offset="65%" stopColor={mid} />
          <stop offset="100%" stopColor={deep} />
        </linearGradient>
        <linearGradient id={`${id}-scrim`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="40%" stopColor="#0b1020" stopOpacity="0" />
          <stop offset="100%" stopColor="#0b1020" stopOpacity="0.62" />
        </linearGradient>
      </defs>

      <rect width="320" height="200" fill={`url(#${id}-sky)`} />
      <circle cx="252" cy="52" r="20" fill="#fff3d0" opacity="0.75" />

      {scene === 'temple' && (
        <g fill={deep} opacity="0.9">
          <rect x="0" y="150" width="320" height="50" />
          {/* gopuram tiers */}
          <path d="M96 150 L110 66 L146 66 L160 150 Z" />
          <path d="M104 104 L152 104 L150 92 L106 92 Z" fill="#00000022" />
          <path d="M112 80 L144 80 L142 70 L114 70 Z" fill="#00000022" />
          <path d="M128 52 L134 66 L122 66 Z" />
          <path d="M188 150 L198 96 L224 96 L234 150 Z" />
          <path d="M40 150 L48 116 L70 116 L78 150 Z" />
          <rect x="122" y="128" width="12" height="22" fill="#00000033" />
        </g>
      )}

      {scene === 'beach' && (
        <g>
          <path d="M0 138 Q80 128 160 138 T320 138 L320 200 L0 200 Z" fill={deep} opacity="0.55" />
          <path d="M0 152 Q80 144 160 152 T320 152 L320 200 L0 200 Z" fill="#f4e2bd" opacity="0.85" />
          <g fill={deep} opacity="0.88">
            <rect x="44" y="96" width="5" height="62" />
            <path d="M46 98 Q24 86 12 96 Q30 88 46 98 Z" />
            <path d="M46 98 Q68 84 82 94 Q62 88 46 98 Z" />
            <path d="M46 98 Q34 78 20 74 Q38 82 46 98 Z" />
            <path d="M46 98 Q60 76 76 72 Q56 82 46 98 Z" />
            <rect x="266" y="110" width="4" height="48" />
            <path d="M268 112 Q252 102 242 110 Q256 104 268 112 Z" />
            <path d="M268 112 Q284 100 296 108 Q280 104 268 112 Z" />
          </g>
        </g>
      )}

      {scene === 'hills' && (
        <g>
          <path d="M0 128 L58 78 L112 122 L166 66 L226 118 L278 88 L320 126 L320 200 L0 200 Z" fill={deep} opacity="0.62" />
          <path d="M0 152 L52 116 L110 150 L172 110 L232 148 L286 122 L320 150 L320 200 L0 200 Z" fill={deep} opacity="0.85" />
          {/* tea-terrace contours */}
          <g stroke="#ffffff" strokeOpacity="0.14" fill="none" strokeWidth="2">
            <path d="M0 168 Q80 158 160 168 T320 166" />
            <path d="M0 182 Q80 172 160 182 T320 180" />
          </g>
        </g>
      )}

      {scene === 'city' && (
        <g fill={deep} opacity="0.88">
          <rect x="0" y="156" width="320" height="44" />
          {[
            [16, 108, 26], [48, 88, 22], [76, 122, 20], [102, 74, 28],
            [136, 112, 24], [166, 92, 30], [202, 126, 22], [230, 84, 26],
            [262, 116, 24], [292, 100, 22],
          ].map(([x, y, w]) => (
            <g key={x}>
              <rect x={x} y={y} width={w} height={156 - y} />
              {Array.from({ length: Math.floor((156 - y) / 16) }).map((_, r) =>
                [0, 1].map((c) => (
                  <rect
                    key={`${r}-${c}`}
                    x={x + 5 + c * 10}
                    y={y + 8 + r * 16}
                    width="5"
                    height="7"
                    fill="#ffd98a"
                    opacity={(x + r * 3 + c) % 3 === 0 ? 0.75 : 0.22}
                  />
                )),
              )}
            </g>
          ))}
        </g>
      )}

      {scene === 'heritage' && (
        <g fill={deep} opacity="0.9">
          <rect x="0" y="156" width="320" height="44" />
          {/* domed monument */}
          <rect x="120" y="118" width="80" height="38" />
          <path d="M124 118 Q160 62 196 118 Z" />
          <path d="M156 62 L164 62 L160 46 Z" />
          <rect x="104" y="96" width="7" height="60" />
          <rect x="209" y="96" width="7" height="60" />
          <circle cx="107" cy="92" r="6" />
          <circle cx="213" cy="92" r="6" />
          <path d="M140 132 Q160 112 180 132 L180 156 L140 156 Z" fill="#00000033" />
        </g>
      )}

      {scene === 'backwater' && (
        <g>
          <path d="M0 130 L320 130 L320 200 L0 200 Z" fill={deep} opacity="0.5" />
          <g stroke="#ffffff" strokeOpacity="0.2" strokeWidth="2" fill="none">
            <path d="M20 158 Q50 152 80 158" />
            <path d="M180 172 Q214 166 248 172" />
            <path d="M60 184 Q96 178 132 184" />
          </g>
          {/* houseboat */}
          <g fill={deep} opacity="0.9">
            <path d="M170 138 L262 138 L254 152 L178 152 Z" />
            <path d="M176 138 Q216 118 256 138 Z" />
            <rect x="196" y="126" width="8" height="10" />
          </g>
          {/* palms on the bank */}
          <g fill={deep} opacity="0.85">
            <rect x="36" y="94" width="4" height="42" />
            <path d="M38 96 Q20 84 8 92 Q24 88 38 96 Z" />
            <path d="M38 96 Q56 84 68 92 Q52 88 38 96 Z" />
            <path d="M38 96 Q28 78 16 72 Q32 80 38 96 Z" />
          </g>
        </g>
      )}

      {scene === 'desert' && (
        <g>
          <path d="M0 142 Q70 118 140 142 T320 138 L320 200 L0 200 Z" fill={deep} opacity="0.5" />
          <path d="M0 162 Q90 140 180 164 T320 158 L320 200 L0 200 Z" fill={deep} opacity="0.82" />
          {/* fort on the ridge */}
          <g fill={deep} opacity="0.9">
            <rect x="196" y="106" width="76" height="38" />
            {[196, 210, 224, 238, 252, 266].map((x) => (
              <rect key={x} x={x} y="98" width="8" height="10" />
            ))}
            <rect x="222" y="122" width="12" height="22" fill="#00000033" />
          </g>
          {/* camel silhouette */}
          <g fill={deep} opacity="0.92">
            <path d="M64 158 Q70 146 78 150 Q84 140 92 150 Q100 146 104 158 L100 172 L96 162 L86 162 L82 172 L76 162 L68 172 Z" />
          </g>
        </g>
      )}

      {scene === 'rail' && (
        <g fill={deep} opacity="0.88">
          <rect x="0" y="150" width="320" height="50" />
          <path d="M0 128 L60 92 L120 126 L180 88 L250 124 L320 100 L320 150 L0 150 Z" opacity="0.55" />
          {/* locomotive + two coaches on an embankment */}
          <g>
            <rect x="70" y="118" width="52" height="26" rx="3" />
            <rect x="126" y="122" width="44" height="22" rx="3" />
            <rect x="174" y="122" width="44" height="22" rx="3" />
            <circle cx="82" cy="148" r="5" />
            <circle cx="110" cy="148" r="5" />
            <circle cx="138" cy="148" r="4" />
            <circle cx="158" cy="148" r="4" />
            <circle cx="186" cy="148" r="4" />
            <circle cx="206" cy="148" r="4" />
            <rect x="66" y="130" width="6" height="8" fill="#ffe7a8" />
          </g>
          <rect x="0" y="152" width="320" height="3" opacity="0.6" />
        </g>
      )}

      {/* bottom scrim so overlaid white text always reads */}
      <rect width="320" height="200" fill={`url(#${id}-scrim)`} />
    </svg>
  );
}
