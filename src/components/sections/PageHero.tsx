import Link from "next/link";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Reveal, Magnetic } from "@/components/ui/motion";
import { StripesBackdrop, FloatingBlobs } from "@/components/ui/Backdrops";

export type Crumb = { label: string; href?: string };

/**
 * Shared page header, reused by every interior page so they match the homepage's
 * polished treatment: animated navy backdrop (stripes + blobs), optional breadcrumb,
 * shiny eyebrow, title, intro, and optional CTAs. Replaces the ~10 hand-rolled
 * `<section className="bg-navy …">` headers.
 */
export function PageHero({
  eyebrow,
  title,
  intro,
  crumbs,
  ctas,
  children,
}: {
  eyebrow?: string;
  title: string;
  intro?: string;
  crumbs?: Crumb[];
  ctas?: { label: string; href: string; icon?: IconName; primary?: boolean }[];
  children?: React.ReactNode;
}) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-navy via-navy to-[#161838] text-offwhite">
      <StripesBackdrop dark />
      <FloatingBlobs dark />
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-20">
        <Reveal>
          {crumbs && crumbs.length > 0 && (
            <nav aria-label="Breadcrumb" className="mb-5 flex flex-wrap items-center gap-1.5 text-sm text-greyblue">
              {crumbs.map((c, i) => (
                <span key={c.label} className="inline-flex items-center gap-1.5">
                  {c.href ? (
                    <Link href={c.href} className="transition-colors hover:text-offwhite">
                      {c.label}
                    </Link>
                  ) : (
                    <span className="text-offwhite/90">{c.label}</span>
                  )}
                  {i < crumbs.length - 1 && <span aria-hidden="true" className="text-greyblue/50">/</span>}
                </span>
              ))}
            </nav>
          )}

          {eyebrow && <Eyebrow className="text-sky-400">{eyebrow}</Eyebrow>}
          <h1 className="mt-3 max-w-3xl font-display text-4xl font-bold leading-[1.08] sm:text-5xl">{title}</h1>
          {intro && <p className="mt-4 max-w-2xl text-lg text-greyblue">{intro}</p>}

          {ctas && ctas.length > 0 && (
            <div className="mt-8 flex flex-wrap gap-3">
              {ctas.map((cta) =>
                cta.primary ? (
                  <Magnetic key={cta.href + cta.label}>
                    <Link
                      href={cta.href}
                      className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-accent to-[#1e4fd6] px-6 py-3 font-semibold text-white shadow-lg shadow-accent/25 transition-all hover:shadow-xl hover:brightness-110 active:scale-[0.98]"
                    >
                      {cta.label}
                      <Icon name={cta.icon ?? "arrowRight"} className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Link>
                  </Magnetic>
                ) : (
                  <Link
                    key={cta.href + cta.label}
                    href={cta.href}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-6 py-3 font-semibold text-offwhite transition-colors hover:bg-white/10"
                  >
                    {cta.icon && <Icon name={cta.icon} className="h-4 w-4" />}
                    {cta.label}
                  </Link>
                ),
              )}
            </div>
          )}

          {children}
        </Reveal>
      </div>
    </section>
  );
}
