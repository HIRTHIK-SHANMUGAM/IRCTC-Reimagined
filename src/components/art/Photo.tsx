import { useState } from 'react';
import type { Scene } from '@/data/catalog';
import { SceneArt } from './SceneArt';
import { cx } from '@/components/ui';

/**
 * A photograph with the drawn scene as its safety net.
 *
 * Destination and property imagery is loaded from /public/images. If a file is
 * missing — or has not been added yet — the matching SceneArt illustration
 * renders instead, so the catalogue never shows a broken image and the app
 * ships with or without photography.
 *
 * Drop a file at the path named in `src` and it appears automatically; no code
 * change is needed. See public/images/README.md for the naming convention.
 */
export function Photo({
  src,
  scene,
  alt,
  className,
  imgClassName,
  priority,
}: {
  /** Path under /public, e.g. "/images/destinations/goa.jpg". */
  src?: string;
  /** Illustration to fall back to. */
  scene: Scene;
  alt: string;
  className?: string;
  imgClassName?: string;
  /** Skips lazy-loading for above-the-fold imagery. */
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) return <SceneArt scene={scene} className={className} />;

  return (
    <span className={cx('block overflow-hidden bg-navy-50', className)}>
      <img
        src={src}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        onError={() => setFailed(true)}
        className={cx('h-full w-full object-cover', imgClassName)}
      />
      {/* Matches the scrim SceneArt paints, so overlaid white text reads the
          same whether this is a photo or the illustration. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0b1020]/65 via-transparent to-transparent"
      />
    </span>
  );
}
