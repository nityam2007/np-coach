/**
 * A traveling light around its parent's border — pure CSS (conic gradient rotated
 * behind a masked ring, see `.border-beam` in globals.css). Ported from MagicUI's
 * Border Beam without the `motion` dependency, so it stays zero-JS.
 *
 * Drop inside any `relative` + rounded container:
 *   <div className="relative rounded-2xl …"><BorderBeam /> …</div>
 */
export function BorderBeam({ duration = 6, className = "" }: { duration?: number; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`border-beam pointer-events-none absolute inset-0 rounded-[inherit] ${className}`}
      style={{ "--beam-duration": `${duration}s` } as React.CSSProperties}
    />
  );
}
