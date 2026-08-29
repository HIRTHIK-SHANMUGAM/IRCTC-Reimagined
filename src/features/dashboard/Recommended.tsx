import { useRef } from 'react';
import { ChevronRight } from 'lucide-react';
import type { Scene } from '@/data/catalog';
import { SceneArt } from '@/components/art/SceneArt';
import { cx } from '@/components/ui';

export interface Recommendation {
  id: string;
  from: string;
  to: string;
  route: string;
  tag: string;
  tagTone: 'confirmed' | 'info';
  note: string;
  scene: Scene;
}

export const RECOMMENDATIONS: Recommendation[] = [
  { id: 'r1', from: 'MAS', to: 'SBC', route: 'Chennai → Bengaluru', tag: 'Weekend Getaway', tagTone: 'confirmed', note: 'Departs: This Weekend', scene: 'city' },
  { id: 'r2', from: 'MAS', to: 'MDU', route: 'Chennai → Madurai', tag: 'Popular Route', tagTone: 'info', note: 'Many trains available', scene: 'temple' },
  { id: 'r3', from: 'MAS', to: 'CBE', route: 'Chennai → Coimbatore', tag: 'High Availability', tagTone: 'confirmed', note: 'Seats available', scene: 'heritage' },
  { id: 'r4', from: 'SBC', to: 'MAS', route: 'Bengaluru → Chennai', tag: 'Short Trip', tagTone: 'info', note: 'Fast & frequent trains', scene: 'hills' },
  { id: 'r5', from: 'MAS', to: 'ERS', route: 'Chennai → Kochi', tag: 'Backwaters', tagTone: 'info', note: 'Overnight, arrive fresh', scene: 'backwater' },
  { id: 'r6', from: 'MAS', to: 'TVC', route: 'Chennai → Thiruvananthapuram', tag: 'Coastal Run', tagTone: 'confirmed', note: 'Good availability this week', scene: 'beach' },
];

/**
 * The horizontally scrolling suggestion rail. Tapping a card pre-fills the
 * search card above it rather than jumping straight to results, so the user
 * stays in control of the query (master prompt: suggest, don't execute).
 */
export function Recommended({ onPick }: { onPick: (r: Recommendation) => void }) {
  const rail = useRef<HTMLDivElement>(null);

  return (
    <div className="relative">
      <div
        ref={rail}
        className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth pb-1"
      >
        {RECOMMENDATIONS.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => onPick(r)}
            className="lift relative h-40 w-[15rem] shrink-0 snap-start overflow-hidden rounded-card text-left"
          >
            <SceneArt scene={r.scene} className="absolute inset-0" />
            <span className="relative flex h-full flex-col justify-between p-3.5">
              <span
                className={cx(
                  'self-start rounded-md px-2 py-1 text-[0.625rem] font-bold uppercase tracking-wide text-white',
                  r.tagTone === 'confirmed' ? 'bg-confirmed' : 'bg-info',
                )}
              >
                {r.tag}
              </span>
              <span>
                <span className="block text-[0.9375rem] font-bold leading-tight text-white drop-shadow">
                  {r.route}
                </span>
                <span className="mt-1 block text-[0.75rem] text-white/85">{r.note}</span>
              </span>
            </span>
          </button>
        ))}
      </div>

      <button
        type="button"
        aria-label="Scroll recommendations"
        onClick={() => rail.current?.scrollBy({ left: 260, behavior: 'smooth' })}
        className="absolute -right-1 top-1/2 hidden h-9 w-9 -translate-y-1/2 place-items-center rounded-full
                   border border-line bg-surface text-navy-700 shadow-lift transition-colors hover:bg-navy-50 sm:grid"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
