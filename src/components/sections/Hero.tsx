"use client";

import Link from "next/link";
import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";
import type { SiteSettings } from "@/lib/directus";
import { assetUrl } from "@/lib/directus";
import type { Stop } from "@/lib/site-config";
import { HeroSearch } from "@/components/sections/HeroSearch";
import { Eyebrow, Stars } from "@/components/ui/Eyebrow";
import { Icon } from "@/components/ui/Icon";

/** Wrap the highlighted word of the tagline in the accent colour (e.g. "…the UK"). */
function withHighlight(text: string, word: string) {
  const idx = word ? text.lastIndexOf(word) : -1;
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <span className="text-accent">{word}</span>
      {text.slice(idx + word.length)}
    </>
  );
}

/** Homepage hero: light split layout — headline + CTAs + rating on the left, coach
 *  photo on the right, and the booking/quote search bar overlapping below. */
export function Hero({ settings, stops }: { settings: SiteSettings; stops: Stop[] }) {
  const { homepage } = settings;
  const coach = assetUrl(settings.heroImage);
  const video = assetUrl(settings.heroVideo);
  const rating = homepage.heroRating;
  const reduce = useReducedMotion();
  /** Simple fade-up entrance — calm and professional, no blur or stagger effects. */
  const entrance = (delay = 0) =>
    reduce
      ? {}
      : ({
          initial: { opacity: 0, y: 16 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const, delay },
        } as const);

  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-tint via-tint-soft to-offwhite" aria-hidden="true" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid items-center gap-10 pt-12 pb-8 lg:grid-cols-2 lg:gap-12 lg:pt-16">
          {/* Left: copy */}
          <motion.div {...entrance()}>
            <Eyebrow className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 shadow-sm ring-1 ring-greyblue/30 backdrop-blur">
              <span className="h-2 w-2 rounded-full bg-accent" aria-hidden="true" />
              {homepage.heroEyebrow}
            </Eyebrow>
            <h1 className="mt-5 font-display text-4xl font-bold leading-[1.05] text-navy sm:text-5xl lg:text-6xl">
              {withHighlight(settings.tagline, homepage.heroHighlight)}
            </h1>
            <p className="mt-6 max-w-xl text-lg text-navy/70">{settings.subtitle}</p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={homepage.heroPrimaryCta.href}
                className="group inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-3 font-semibold text-white shadow-sm shadow-accent/20 transition-all hover:bg-brand-hover hover:shadow-md active:scale-[0.98]"
              >
                {homepage.heroPrimaryCta.label}
                <Icon name="arrowRight" className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href={homepage.heroSecondaryCta.href}
                className="inline-flex items-center gap-2 rounded-xl border border-navy/15 bg-white px-6 py-3 font-semibold text-navy shadow-sm transition-all hover:border-accent/40 hover:bg-navy hover:text-white active:scale-[0.98]"
              >
                {homepage.heroSecondaryCta.label}
              </Link>
            </div>

            {rating.platform && (
              <div className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-2">
                <span className="inline-flex items-center gap-1.5 font-semibold text-navy">
                  <Icon name="star" className="h-5 w-5 text-emerald-500" />
                  {rating.platform}
                </span>
                <Stars rating={5} className="h-4 w-4 text-emerald-500" />
                <span className="text-sm text-navy/70">
                  {rating.score} {rating.reviews}
                </span>
              </div>
            )}
          </motion.div>

          {/* Right: coach photo */}
          <motion.div className="relative" {...entrance(0.1)}>
            {video || coach ? (
              <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-navy/5 shadow-lg shadow-navy/10 ring-1 ring-white/60" role="img" aria-label={settings.heroImageAlt}>
                {video ? (
                  <video autoPlay muted loop playsInline preload="metadata" poster={coach ?? undefined} className="absolute inset-0 h-full w-full object-cover" aria-hidden="true">
                    <source src={video} type="video/mp4" />
                  </video>
                ) : coach ? (
                  <Image src={coach} alt={settings.heroImageAlt} fill priority sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover" />
                ) : null}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-navy/30 via-transparent to-transparent" />

                {/* Fleet trust badge */}
                <div className="absolute bottom-4 left-4 flex items-center gap-3 rounded-2xl bg-white/90 px-4 py-3 shadow-sm shadow-navy/10 ring-1 ring-white/60 backdrop-blur">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent/10 text-accent">
                    <Icon name="shield" className="h-5 w-5" />
                  </span>
                  <span className="leading-tight">
                    <span className="block font-display text-lg font-bold text-navy">15+</span>
                    <span className="block text-xs font-medium text-navy/70">Euro-6 coaches</span>
                  </span>
                </div>
              </div>
            ) : (
              <div className="grid aspect-[4/3] place-items-center rounded-3xl bg-navy text-greyblue shadow-lg shadow-navy/10">
                <Icon name="bus" className="h-16 w-16" />
              </div>
            )}
          </motion.div>
        </div>

        {/* Search bar (overlaps the hero / next section) */}
        <motion.div className="relative z-10 pb-14" {...entrance(0.2)}>
          <HeroSearch stops={stops} features={homepage.searchFeatures} />
        </motion.div>
      </div>
    </section>
  );
}
