import Image from "next/image";
import Link from "next/link";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Reveal } from "@/components/ui/motion";
import { ButtonLink } from "@/components/ui/Button";
import { StripesBackdrop, FloatingBlobs } from "@/components/ui/Backdrops";
import { assetUrl, getSettings, selectPageHeroFallback, type DirectusFileRef } from "@/lib/directus";

export type Crumb = { label: string; href?: string };

/**
 * Shared page header. A CMS image becomes a full-bleed hero background with a
 * contrast overlay; pages without an image retain the lightweight brand texture.
 */
export async function PageHero({
  eyebrow,
  title,
  intro,
  crumbs,
  ctas,
  children,
  image,
  imageAlt = "",
  priority = true,
  fallbackKey,
  useFallback = true,
}: {
  eyebrow?: string;
  title: string;
  intro?: string;
  crumbs?: Crumb[];
  ctas?: { label: string; href: string; icon?: IconName; primary?: boolean }[];
  children?: React.ReactNode;
  image?: DirectusFileRef;
  imageAlt?: string;
  priority?: boolean;
  fallbackKey?: string;
  useFallback?: boolean;
}) {
  const explicitBackground = assetUrl(image);
  const fallback = !explicitBackground && useFallback
    ? selectPageHeroFallback(await getSettings(), fallbackKey ?? title)
    : null;
  const background = explicitBackground ?? assetUrl(fallback?.image);
  const backgroundAlt = explicitBackground ? imageAlt : (fallback?.imageAlt ?? imageAlt);
  const hasBackground = Boolean(background);

  return (
    <section className={`relative isolate overflow-hidden border-b border-accent/10 ${hasBackground ? "bg-navy text-offwhite" : "bg-gradient-to-br from-white via-tint-soft to-tint text-navy"}`}>
      {background ? (
        <>
          <Image src={background} alt={backgroundAlt} fill priority={priority} sizes="100vw" className="z-0 object-cover" />
          <div aria-hidden="true" className="absolute inset-0 z-[1] bg-gradient-to-r from-navy/95 via-navy/78 to-navy/42" />
          <div aria-hidden="true" className="absolute inset-0 z-[1] bg-gradient-to-t from-navy/75 via-transparent to-navy/20" />
        </>
      ) : (
        <>
          <StripesBackdrop />
          <FloatingBlobs />
        </>
      )}
      <div className={`relative z-10 mx-auto flex max-w-7xl px-4 sm:px-6 ${hasBackground ? "min-h-[clamp(28rem,42.85vw,42rem)] items-center py-16 lg:py-20" : "py-16 lg:py-20"}`}>
        <Reveal className="w-full">
          {crumbs && crumbs.length > 0 && (
            <nav aria-label="Breadcrumb" className={`mb-5 flex flex-wrap items-center gap-1.5 text-sm ${hasBackground ? "text-offwhite/70" : "text-navy/60"}`}>
              {crumbs.map((c, i) => (
                <span key={c.label} className="inline-flex items-center gap-1.5">
                  {c.href ? (
                    <Link href={c.href} className={`transition-colors ${hasBackground ? "hover:text-white" : "hover:text-navy"}`}>
                      {c.label}
                    </Link>
                  ) : (
                    <span className={hasBackground ? "text-offwhite/90" : "text-navy/90"}>{c.label}</span>
                  )}
                  {i < crumbs.length - 1 && <span aria-hidden="true" className={hasBackground ? "text-offwhite/40" : "text-navy/35"}>/</span>}
                </span>
              ))}
            </nav>
          )}

          {eyebrow && <Eyebrow className="text-sky-400">{eyebrow}</Eyebrow>}
          <h1 className="mt-3 max-w-3xl font-display text-4xl font-bold leading-[1.08] sm:text-5xl">{title}</h1>
          {intro && <p className={`mt-4 max-w-2xl text-lg ${hasBackground ? "text-offwhite/85" : "text-navy/70"}`}>{intro}</p>}

          {ctas && ctas.length > 0 && (
            <div className="mt-8 flex flex-wrap gap-3">
              {ctas.map((cta) =>
                cta.primary ? (
                  <ButtonLink key={cta.href + cta.label} href={cta.href} className="group">
                    {cta.label}
                    <Icon name={cta.icon ?? "arrowRight"} className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </ButtonLink>
                ) : (
                  <ButtonLink key={cta.href + cta.label} href={cta.href} variant={hasBackground ? "ghostDark" : "secondary"}>
                    {cta.icon && <Icon name={cta.icon} className="h-4 w-4" />}
                    {cta.label}
                  </ButtonLink>
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
