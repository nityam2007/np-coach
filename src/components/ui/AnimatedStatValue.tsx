"use client";

import { useEffect, useRef, useState } from "react";

export function AnimatedStatValue({ value }: { value: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    const match = value.match(/^([^0-9]*)([0-9][0-9,.]*)(.*)$/);
    const element = ref.current;
    if (!match || !element || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const [, prefix, numeric, suffix] = match;
    const target = Number(numeric.replaceAll(",", ""));
    if (!Number.isFinite(target)) return;
    let frame = 0;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      const started = performance.now();
      const tick = (now: number) => {
        const progress = Math.min(1, (now - started) / 1100);
        const next = Math.round(target * (1 - Math.pow(1 - progress, 3))).toLocaleString("en-GB");
        setDisplay(`${prefix}${next}${suffix}`);
        if (progress < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
      observer.disconnect();
    }, { threshold: 0.35 });
    observer.observe(element);
    return () => { observer.disconnect(); cancelAnimationFrame(frame); };
  }, [value]);

  return <span ref={ref}>{display}</span>;
}