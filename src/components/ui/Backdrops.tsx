"use client";

/**
 * Decorative animated backdrops (behind hero / CTA bands). All are pointer-events-none,
 * aria-hidden, absolutely positioned to fill their (relative) parent, and pause under
 * prefers-reduced-motion. Keeps sections lively without a canvas or heavy JS.
 */

import { motion, useReducedMotion } from "motion/react";

/** Diagonal moving stripes — the "Stripe-style" animated band. `dark` for navy sections. */
export function StripesBackdrop({ dark = false }: { dark?: boolean }) {
  const reduce = useReducedMotion();
  const line = dark ? "rgba(255,255,255,0.06)" : "rgba(37,99,235,0.06)";
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <motion.div
        className="absolute inset-[-20%]"
        style={{
          backgroundImage: `repeating-linear-gradient(115deg, ${line} 0 2px, transparent 2px 22px)`,
        }}
        animate={reduce ? undefined : { backgroundPositionX: ["0px", "220px"] }}
        transition={{ duration: 12, ease: "linear", repeat: Infinity }}
      />
    </div>
  );
}

/** Soft floating blobs for depth — drift slowly around their container. */
export function FloatingBlobs({ dark = false }: { dark?: boolean }) {
  const reduce = useReducedMotion();
  const c = dark ? "bg-accent/25" : "bg-accent/15";
  const c2 = dark ? "bg-sky-400/20" : "bg-sky-400/15";
  const drift = (dx: number, dy: number) =>
    reduce ? undefined : { x: [0, dx, 0], y: [0, dy, 0] };
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <motion.div
        className={`absolute -left-24 top-10 h-72 w-72 rounded-full ${c} blur-3xl`}
        animate={drift(40, 30)}
        transition={{ duration: 14, ease: "easeInOut", repeat: Infinity }}
      />
      <motion.div
        className={`absolute right-0 top-1/3 h-80 w-80 rounded-full ${c2} blur-3xl`}
        animate={drift(-50, 40)}
        transition={{ duration: 18, ease: "easeInOut", repeat: Infinity }}
      />
    </div>
  );
}

/** Animated dotted grid that slowly pans — a subtle tech texture. */
export function GridBackdrop({ dark = false }: { dark?: boolean }) {
  const reduce = useReducedMotion();
  const dot = dark ? "rgba(255,255,255,0.10)" : "rgba(14,15,39,0.08)";
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <motion.div
        className="absolute inset-[-10%]"
        style={{ backgroundImage: `radial-gradient(${dot} 1px, transparent 1px)`, backgroundSize: "26px 26px" }}
        animate={reduce ? undefined : { backgroundPositionX: ["0px", "26px"], backgroundPositionY: ["0px", "26px"] }}
        transition={{ duration: 20, ease: "linear", repeat: Infinity }}
      />
    </div>
  );
}
