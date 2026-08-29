/**
 * The login hero (addendum §2): a WAP-7 electric locomotive at a platform in
 * golden-hour light, and it is genuinely moving — the locomotive holds the
 * frame while the world scrolls past it in four parallax bands (far hills,
 * treeline, catenary masts, track). Wheels turn, the headlight throws a beam,
 * exhaust drifts back off the roof.
 *
 * The viewBox is portrait (640×900) to match the tall login panel, so nothing
 * important is cropped when the scene is sliced to cover. Drawn rather than
 * photographed so it loads instantly, scales to any panel, and can animate.
 * Honours prefers-reduced-motion, where the whole scene simply holds still.
 */
export function TrainHero({ className }: { className?: string }) {
  return (
    <div className={className} aria-hidden="true">
      <style>{`
        @keyframes ri-hills { to { transform: translateX(-320px); } }
        @keyframes ri-trees { to { transform: translateX(-260px); } }
        @keyframes ri-poles { to { transform: translateX(-220px); } }
        @keyframes ri-track { to { transform: translateX(-64px); } }
        @keyframes ri-wheel { to { transform: rotate(360deg); } }
        @keyframes ri-bob   { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-1.5px); } }
        @keyframes ri-smoke { 0%   { opacity: 0; transform: translate(0,0) scale(.6); }
                              25%  { opacity: .34; }
                              100% { opacity: 0; transform: translate(-70px,-58px) scale(2.6); } }
        @keyframes ri-glow  { 0%,100% { opacity: .55; } 50% { opacity: .85; } }
        .ri-hills { animation: ri-hills 30s linear infinite; }
        .ri-trees { animation: ri-trees 15s linear infinite; }
        .ri-poles { animation: ri-poles 5s  linear infinite; }
        .ri-track { animation: ri-track 0.5s linear infinite; }
        .ri-wheel { animation: ri-wheel 0.85s linear infinite; transform-origin: center; transform-box: fill-box; }
        .ri-bob   { animation: ri-bob 2.4s ease-in-out infinite; }
        .ri-smoke { animation: ri-smoke 3.6s ease-out infinite; }
        .ri-glow  { animation: ri-glow 5s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .ri-hills,.ri-trees,.ri-poles,.ri-track,.ri-wheel,.ri-bob,.ri-smoke,.ri-glow {
            animation: none !important;
          }
        }
      `}</style>

      <svg
        viewBox="0 0 640 900"
        preserveAspectRatio="xMidYMid slice"
        className="h-full w-full"
        role="presentation"
      >
        <defs>
          <linearGradient id="ri-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#16305f" />
            <stop offset="26%" stopColor="#43569b" />
            <stop offset="46%" stopColor="#9b6f97" />
            <stop offset="62%" stopColor="#e08a5c" />
            <stop offset="78%" stopColor="#f5a95a" />
            <stop offset="100%" stopColor="#fbc97f" />
          </linearGradient>
          <radialGradient id="ri-sun" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fff6dd" stopOpacity="1" />
            <stop offset="40%" stopColor="#ffcd75" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#ff9440" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="ri-ground" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6d5b48" />
            <stop offset="100%" stopColor="#372c22" />
          </linearGradient>
          <linearGradient id="ri-platform" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#cfc4b4" />
            <stop offset="100%" stopColor="#7d7365" />
          </linearGradient>
          {/* WAP-7 livery: cream body, deep blue skirt, red flash */}
          <linearGradient id="ri-body" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fffdf8" />
            <stop offset="58%" stopColor="#ece5d7" />
            <stop offset="100%" stopColor="#cbc2b0" />
          </linearGradient>
          <linearGradient id="ri-beam" x1="1" y1="0" x2="0" y2="0">
            <stop offset="0%" stopColor="#fff3cd" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#fff3cd" stopOpacity="0" />
          </linearGradient>
          <clipPath id="ri-frame">
            <rect x="0" y="0" width="640" height="900" />
          </clipPath>
        </defs>

        <g clipPath="url(#ri-frame)">
          {/* ------------------------------------------------------- sky */}
          <rect width="640" height="900" fill="url(#ri-sky)" />
          <circle className="ri-glow" cx="470" cy="430" r="165" fill="url(#ri-sun)" />
          <circle cx="470" cy="430" r="36" fill="#ffe9b8" opacity="0.92" />

          <g fill="#ffffff" opacity="0.11">
            <ellipse cx="170" cy="190" rx="135" ry="11" />
            <ellipse cx="430" cy="260" rx="165" ry="9" />
            <ellipse cx="540" cy="150" rx="105" ry="8" />
            <ellipse cx="240" cy="330" rx="120" ry="8" />
          </g>

          {/* --------------------------------------- far hills (band 1) */}
          <g className="ri-hills">
            {[0, 320, 640, 960].map((x) => (
              <path
                key={x}
                d={`M${x} 545 L${x + 48} 496 L${x + 96} 528 L${x + 152} 474 L${x + 210} 520 L${x + 264} 488 L${x + 320} 545 Z`}
                fill="#3f3c62"
                opacity="0.6"
              />
            ))}
          </g>

          {/* ---------------------------------------- treeline (band 2) */}
          <g className="ri-trees">
            {[0, 260, 520, 780].map((x) => (
              <g key={x} fill="#262c47" opacity="0.8">
                <rect x={x} y="548" width="260" height="26" />
                {[10, 44, 80, 116, 154, 190, 226].map((o, i) => (
                  <ellipse key={o} cx={x + o} cy={548} rx={12 + (i % 3) * 3} ry={14 + (i % 2) * 6} />
                ))}
              </g>
            ))}
          </g>

          {/* ------------------------- catenary masts + wires (band 3) */}
          <g className="ri-poles">
            {[0, 220, 440, 660, 880].map((x) => (
              <g key={x} stroke="#161b28" strokeWidth="3.5" opacity="0.82">
                <line x1={x + 30} y1="250" x2={x + 30} y2="580" />
                <line x1={x + 30} y1="272" x2={x + 112} y2="272" strokeWidth="3" />
                <line x1={x + 112} y1="272" x2={x + 112} y2="302" strokeWidth="2.5" />
                <line x1={x + 34} y1="252" x2={x + 30} y2="280" strokeWidth="2.5" />
              </g>
            ))}
            <line x1="0" y1="302" x2="1120" y2="302" stroke="#161b28" strokeWidth="3" opacity="0.78" />
            <line x1="0" y1="274" x2="1120" y2="274" stroke="#161b28" strokeWidth="2.5" opacity="0.55" />
          </g>

          {/* ------------------------------------------ ground + track */}
          <rect x="0" y="574" width="640" height="326" fill="url(#ri-ground)" />
          <g className="ri-track">
            {Array.from({ length: 26 }).map((_, i) => (
              <rect key={i} x={i * 32 - 32} y="676" width="21" height="8" rx="2" fill="#221a13" opacity="0.85" />
            ))}
          </g>
          <rect x="0" y="668" width="640" height="5" fill="#94897a" />
          <rect x="0" y="686" width="640" height="6" fill="#6e6355" />
          <rect x="0" y="692" width="640" height="4" fill="#221a13" opacity="0.5" />

          {/* ------------------------------------- the WAP-7 and rake */}
          <g className="ri-bob">
            {/* headlight beam thrown forward down the track */}
            <path d="M62 622 L-70 596 L-70 668 L62 646 Z" fill="url(#ri-beam)" />

            {/* trailing coaches, behind the loco to the right */}
            {[398, 578].map((x) => (
              <g key={x}>
                <rect x={x} y="512" width="172" height="130" rx="7" fill="#2b4680" />
                <rect x={x} y="512" width="172" height="15" rx="6" fill="#21356a" />
                <rect x={x + 4} y="538" width="164" height="4" fill="#ded6c6" opacity="0.5" />
                {[13, 47, 81, 115].map((o) => (
                  <rect key={o} x={x + o} y="552" width="28" height="26" rx="3" fill="#0e1930" opacity="0.85" />
                ))}
                <rect x={x + 6} y="600" width="160" height="18" fill="#1a2a50" />
                <rect x={x} y="632" width="172" height="10" fill="#131c2e" />
                {[28, 118].map((o) => (
                  <g key={o}>
                    <rect x={x + o - 6} y="642" width="50" height="11" rx="3" fill="#161616" />
                    <circle className="ri-wheel" cx={x + o + 3} cy="662" r="13" fill="#1d1d1d" stroke="#4c4c4c" strokeWidth="3" />
                    <circle className="ri-wheel" cx={x + o + 33} cy="662" r="13" fill="#1d1d1d" stroke="#4c4c4c" strokeWidth="3" />
                  </g>
                ))}
              </g>
            ))}

            {/* --- the locomotive --- */}
            <g>
              {/* pantograph reaching the contact wire */}
              <g stroke="#11141c" strokeWidth="4" fill="none">
                <path d="M196 494 L176 306 M240 494 L260 306" />
                <line x1="164" y1="303" x2="272" y2="303" strokeWidth="5" />
                <line x1="184" y1="404" x2="252" y2="404" strokeWidth="3.5" />
              </g>

              {/* roof equipment */}
              <rect x="92" y="486" width="286" height="13" rx="4" fill="#7b7264" />
              <rect x="140" y="474" width="52" height="13" rx="3" fill="#6a6153" />
              <rect x="272" y="474" width="52" height="13" rx="3" fill="#6a6153" />

              {/* body shell + raked nose */}
              <path d="M64 499 Q64 494 71 494 L372 494 Q379 494 379 501 L379 626 L64 626 Z" fill="url(#ri-body)" />
              <path d="M64 499 L64 626 L38 626 Q34 584 52 528 Q56 507 64 499 Z" fill="#f2ede2" />

              {/* red flash along the flank */}
              <rect x="38" y="566" width="341" height="17" fill="#c8342b" />
              <rect x="38" y="583" width="341" height="5" fill="#8d211b" opacity="0.7" />

              {/* deep blue skirt */}
              <rect x="38" y="602" width="341" height="28" fill="#1f3178" />
              <rect x="38" y="626" width="341" height="7" fill="#152257" />

              {/* cab window */}
              <path d="M56 514 L106 514 L106 552 L49 552 Q49 530 56 514 Z" fill="#1e2e4d" opacity="0.93" />
              <rect x="57" y="518" width="20" height="13" fill="#93b8dc" opacity="0.35" />

              {/* side louvres */}
              <g fill="#c1b9a8" opacity="0.85">
                {[124, 158, 192, 226, 260, 294, 328].map((x) => (
                  <rect key={x} x={x} y="512" width="22" height="42" rx="2" />
                ))}
              </g>
              <g fill="#a49b89" opacity="0.55">
                {[124, 158, 192, 226, 260, 294, 328].map((x) => (
                  <rect key={x} x={x} y="519" width="22" height="2" />
                ))}
              </g>

              {/* number panel */}
              <rect x="124" y="590" width="74" height="15" rx="2" fill="#f7f3e9" />
              <text x="161" y="602" textAnchor="middle" fontSize="11" fontWeight="700" fill="#1f3178" fontFamily="system-ui, sans-serif">
                30478
              </text>

              {/* headlights */}
              <circle cx="47" cy="538" r="8" fill="#fff6d0" />
              <circle cx="47" cy="538" r="14" fill="#fff6d0" opacity="0.25" />
              <circle cx="44" cy="616" r="5.5" fill="#ffd9a0" opacity="0.9" />

              {/* buffer */}
              <rect x="29" y="610" width="10" height="18" rx="2" fill="#383838" />

              {/* bogies with rotating wheels */}
              {[86, 254].map((x) => (
                <g key={x}>
                  <rect x={x - 8} y="632" width="92" height="13" rx="3" fill="#161616" />
                  <circle className="ri-wheel" cx={x + 6} cy="658" r="19" fill="#1d1d1d" stroke="#565759" strokeWidth="4.5" />
                  <circle className="ri-wheel" cx={x + 40} cy="658" r="19" fill="#1d1d1d" stroke="#565759" strokeWidth="4.5" />
                  <circle className="ri-wheel" cx={x + 74} cy="658" r="19" fill="#1d1d1d" stroke="#565759" strokeWidth="4.5" />
                  <circle cx={x + 6} cy="658" r="5" fill="#6a6a6a" />
                  <circle cx={x + 40} cy="658" r="5" fill="#6a6a6a" />
                  <circle cx={x + 74} cy="658" r="5" fill="#6a6a6a" />
                </g>
              ))}
            </g>

            {/* exhaust drifting back off the roof */}
            <g fill="#ffffff">
              <circle className="ri-smoke" cx="310" cy="468" r="11" style={{ animationDelay: '0s' }} />
              <circle className="ri-smoke" cx="310" cy="468" r="9" style={{ animationDelay: '1.2s' }} />
              <circle className="ri-smoke" cx="310" cy="468" r="13" style={{ animationDelay: '2.4s' }} />
            </g>
          </g>

          {/* --------------------------------------- platform foreground */}
          <ellipse cx="320" cy="706" rx="330" ry="14" fill="#251d15" opacity="0.3" />
          <rect x="0" y="712" width="640" height="188" fill="url(#ri-platform)" />
          <rect x="0" y="712" width="640" height="7" fill="#efe8db" />
          <g fill="#d3a041" opacity="0.85">
            {Array.from({ length: 22 }).map((_, i) => (
              <circle key={i} cx={i * 30 + 14} cy="734" r="4.5" />
            ))}
          </g>

          {/* warm haze tying the palette together */}
          <rect width="640" height="900" fill="#ff9440" opacity="0.06" />
        </g>
      </svg>
    </div>
  );
}
