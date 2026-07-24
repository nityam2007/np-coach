/**
 * Decorative static backdrops (behind hero / CTA bands). All are pointer-events-none,
 * aria-hidden, and absolutely positioned to fill their (relative) parent. Pure CSS —
 * subtle texture and depth without any animation or JS runtime.
 */

/** Diagonal stripes texture. `dark` for navy sections. */
export function StripesBackdrop({ dark = false }: { dark?: boolean }) {
  const line = dark ? "rgba(255,255,255,0.06)" : "rgba(37,99,235,0.06)";
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div
        className="absolute inset-[-20%]"
        style={{
          backgroundImage: `repeating-linear-gradient(115deg, ${line} 0 2px, transparent 2px 22px)`,
        }}
      />
    </div>
  );
}

/** Soft gradient glows for depth. */
export function FloatingBlobs({ dark = false }: { dark?: boolean }) {
  const c = dark ? "bg-accent/25" : "bg-accent/15";
  const c2 = dark ? "bg-sky-400/20" : "bg-sky-400/15";
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className={`absolute -left-24 top-10 h-72 w-72 rounded-full ${c} blur-3xl`} />
      <div className={`absolute right-0 top-1/3 h-80 w-80 rounded-full ${c2} blur-3xl`} />
    </div>
  );
}

/** Dotted grid texture. */
export function GridBackdrop({ dark = false }: { dark?: boolean }) {
  const dot = dark ? "rgba(255,255,255,0.10)" : "rgba(23,37,84,0.08)";
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div
        className="absolute inset-[-10%]"
        style={{ backgroundImage: `radial-gradient(${dot} 1px, transparent 1px)`, backgroundSize: "26px 26px" }}
      />
    </div>
  );
}
