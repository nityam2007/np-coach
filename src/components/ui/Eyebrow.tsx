import { Icon } from "./Icon";

/**
 * Small accent label above a section heading ("TAILORED TRANSPORT SOLUTIONS").
 * Pass a className to recolour it on dark backgrounds.
 */
export function Eyebrow({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={`font-display text-xs font-semibold uppercase tracking-[0.18em] text-accent ${className}`}>
      {children}
    </p>
  );
}

/** A row of filled/empty stars — reused by the hero rating and testimonials. */
export function Stars({ rating = 5, className = "h-4 w-4 text-amber-400" }: { rating?: number; className?: string }) {
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Icon key={i} name="star" className={`${className} ${i < rating ? "" : "opacity-25"}`} />
      ))}
    </span>
  );
}
