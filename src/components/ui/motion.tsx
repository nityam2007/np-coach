"use client";

/**
 * Reusable motion primitives (framer-motion / `motion`), used across the site.
 * Kept tiny and composable — every section imports these rather than re-wiring
 * `motion` itself. Entrances are plain fade/rise (no blur, no 3D) at 0.5s ease-out,
 * and all motion respects `prefers-reduced-motion` via framer's `useReducedMotion`.
 */

import { motion, useReducedMotion, type Variants } from "motion/react";
import { type ReactNode } from "react";

/* ---- Scroll reveal (fade + rise), optionally staggered by children ---- */

const revealVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

/** Fade/rise a block into view as it scrolls in. `delay` staggers manually. */
export function Reveal({
  children,
  className = "",
  delay = 0,
  y = 16,
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  as?: "div" | "section" | "li" | "span";
}) {
  const reduce = useReducedMotion();
  const MotionTag = motion[as];
  return (
    <MotionTag
      className={className}
      initial={reduce ? false : "hidden"}
      whileInView="show"
      viewport={{ once: true, margin: "-80px" }}
      variants={{
        hidden: { opacity: 0, y },
        show: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1], delay },
        },
      }}
    >
      {children}
    </MotionTag>
  );
}

/** Container that staggers its <Stagger.Item> children as the group enters view. */
export function Stagger({
  children,
  className = "",
  gap = 0.08,
}: {
  children: ReactNode;
  className?: string;
  gap?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : "hidden"}
      whileInView="show"
      viewport={{ once: true, margin: "-60px" }}
      variants={{ show: { transition: { staggerChildren: gap } } }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <motion.div className={className} variants={revealVariants}>
      {children}
    </motion.div>
  );
}
