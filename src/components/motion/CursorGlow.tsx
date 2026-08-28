import { useEffect, useRef } from 'react';
import { usePrefersReducedMotion, useHasFinePointer } from '@/hooks/useReducedMotion';

/**
 * A mild cursor-follow effect: a soft lagging ring that grows over anything
 * interactive. Taken from the "cursor follow animations" (Jesper Landberg) and
 * "enlarged cursor effect" (CO'WATCH) references in docs/DESIGN_RESEARCH.md.
 *
 * Deliberately restrained:
 *  - the native cursor is never hidden, so nothing about pointing changes
 *  - it does not exist on touch devices or under prefers-reduced-motion
 *  - it is pointer-events:none and aria-hidden, so it cannot intercept a click
 *  - position is written straight to the DOM, so it never re-renders React
 */
export function CursorGlow() {
  const ringRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();
  const fine = useHasFinePointer();
  const enabled = fine && !reduced;

  useEffect(() => {
    if (!enabled) return;

    const ring = ringRef.current;
    const dot = dotRef.current;
    if (!ring || !dot) return;

    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;
    let x = targetX;
    let y = targetY;
    let scale = 1;
    let targetScale = 1;
    let opacity = 0;
    let targetOpacity = 0;
    let frame = 0;

    const INTERACTIVE = 'a, button, [role="button"], input, select, textarea, [data-cursor="grow"]';

    const onMove = (e: PointerEvent) => {
      targetX = e.clientX;
      targetY = e.clientY;
      targetOpacity = 1;
      const el = e.target as Element | null;
      targetScale = el?.closest?.(INTERACTIVE) ? 2.1 : 1;
    };

    const onLeave = () => {
      targetOpacity = 0;
    };

    const onDown = () => {
      targetScale = Math.max(0.7, targetScale * 0.62);
    };

    const onUp = (e: PointerEvent) => {
      const el = e.target as Element | null;
      targetScale = el?.closest?.(INTERACTIVE) ? 2.1 : 1;
    };

    const tick = () => {
      // Lag is the whole effect — the ring trails, the dot keeps up.
      x += (targetX - x) * 0.16;
      y += (targetY - y) * 0.16;
      scale += (targetScale - scale) * 0.18;
      opacity += (targetOpacity - opacity) * 0.12;

      ring.style.transform = `translate3d(${x - 18}px, ${y - 18}px, 0) scale(${scale.toFixed(3)})`;
      ring.style.opacity = String(opacity.toFixed(3));
      dot.style.transform = `translate3d(${targetX - 2.5}px, ${targetY - 2.5}px, 0)`;
      dot.style.opacity = String(opacity.toFixed(3));

      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown, { passive: true });
    window.addEventListener('pointerup', onUp, { passive: true });
    document.addEventListener('pointerleave', onLeave);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointerleave', onLeave);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[70]">
      <div
        ref={ringRef}
        className="absolute left-0 top-0 h-9 w-9 rounded-full border border-teal-600/35 bg-teal-600/[0.06] opacity-0 will-change-transform"
      />
      <div
        ref={dotRef}
        className="absolute left-0 top-0 h-[5px] w-[5px] rounded-full bg-teal-700/70 opacity-0 will-change-transform"
      />
    </div>
  );
}
