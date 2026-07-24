"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "motion/react";
import type { SiteSettings } from "@/lib/directus";
import { assetUrl } from "@/lib/directus";
import type { Stop } from "@/lib/site-config";
import { HeroSearch } from "@/components/sections/HeroSearch";
import { Eyebrow, Stars } from "@/components/ui/Eyebrow";
import { Icon } from "@/components/ui/Icon";
import { Tilt, Magnetic } from "@/components/ui/motion";
import { FloatingBlobs } from "@/components/ui/Backdrops";

/** Staggered container/child variants for the hero copy entrance. */
const container = { hidden: {}, show: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } } };
const rise = {
  hidden: { opacity: 0, y: 24, filter: "blur(6px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const } },
};

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
  const rating = homepage.heroRating;

  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#e8eefb] via-[#f2f5fc] to-offwhite" aria-hidden="true" />
      <FloatingBlobs />

      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid items-center gap-10 pt-12 pb-8 lg:grid-cols-2 lg:gap-12 lg:pt-16">
          {/* Left: copy — staggered entrance */}
          <motion.div initial="hidden" animate="show" variants={container}>
            <motion.div variants={rise}>
              <Eyebrow
                shiny
                className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 shadow-sm ring-1 ring-greyblue/30 backdrop-blur"
              >
                <span className="relative flex h-2 w-2" aria-hidden="true">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-accent opacity-60 motion-safe:animate-ping" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
                </span>
                {homepage.heroEyebrow}
              </Eyebrow>
            </motion.div>
            <motion.h1
              variants={rise}
              className="mt-5 font-display text-4xl font-bold leading-[1.05] text-navy sm:text-5xl lg:text-6xl"
            >
              {withHighlight(settings.tagline, homepage.heroHighlight)}
            </motion.h1>
            <motion.p variants={rise} className="mt-6 max-w-xl text-lg text-navy/70">
              {settings.subtitle}
            </motion.p>

            <motion.div variants={rise} className="mt-8 flex flex-wrap gap-3">
              <Magnetic>
                <Link
                  href={homepage.heroPrimaryCta.href}
                  className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-accent to-[#1e4fd6] px-6 py-3 font-semibold text-white shadow-lg shadow-accent/25 transition-all hover:shadow-xl hover:shadow-accent/30 hover:brightness-110 active:scale-[0.98]"
                >
                  {homepage.heroPrimaryCta.label}
                  <Icon name="arrowRight" className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Magnetic>
              <Link
                href={homepage.heroSecondaryCta.href}
                className="inline-flex items-center gap-2 rounded-xl border border-navy/15 bg-white px-6 py-3 font-semibold text-navy shadow-sm transition-all hover:border-accent/40 hover:bg-navy hover:text-white active:scale-[0.98]"
              >
                {homepage.heroSecondaryCta.label}
              </Link>
            </motion.div>

            {rating.platform && (
              <motion.div variants={rise} className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-2">
                <span className="inline-flex items-center gap-1.5 font-semibold text-navy">
                  <Icon name="star" className="h-5 w-5 text-emerald-500" />
                  {rating.platform}
                </span>
                <Stars rating={5} className="h-4 w-4 text-emerald-500" />
                <span className="text-sm text-navy/60">
                  {rating.score} {rating.reviews}
                </span>
              </motion.div>
            )}
          </motion.div>

          {/* Right: coach photo — 3D tilt toward the cursor */}
          <motion.div
            className="relative"
            initial={{ opacity: 0, scale: 0.94, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
          >
            {/* Decorative floating ring for depth behind the photo. */}
            <div
              aria-hidden="true"
              className="animate-float pointer-events-none absolute -right-6 -top-6 -z-10 h-24 w-24 rounded-3xl border-2 border-accent/20"
            />
            {coach ? (
              <Tilt max={7}>
                {/* The rounded clip and the hover-zoom live on the SAME element: we scale
                    the whole rounded container (not the image inside it), so the rounded
                    border scales with it and the corners never square off. The image just
                    fills it. */}
                <div className="group relative aspect-[4/3] overflow-hidden rounded-3xl bg-navy/5 shadow-2xl shadow-navy/25 ring-1 ring-white/60 transition-transform duration-700 ease-out group-hover:scale-[1.02]">
                  <Image
                    src={coach}
                    alt={`${settings.name} coach`}
                    fill
                    priority
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    className="object-cover"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-navy/30 via-transparent to-transparent" />

                  {/* Floating trust badge — hand-placed, human touch. */}
                  <motion.div
                    className="absolute bottom-4 left-4 flex items-center gap-3 rounded-2xl bg-white/90 px-4 py-3 shadow-lg shadow-navy/15 ring-1 ring-white/60 backdrop-blur"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6, duration: 0.5 }}
                    style={{ transform: "translateZ(40px)" }}
                  >
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent/10 text-accent">
                      <Icon name="shield" className="h-5 w-5" />
                    </span>
                    <span className="leading-tight">
                      <span className="block font-display text-lg font-bold text-navy">15+</span>
                      <span className="block text-xs font-medium text-navy/60">Euro-6 coaches</span>
                    </span>
                  </motion.div>
                </div>
              </Tilt>
            ) : (
              <div className="grid aspect-[4/3] place-items-center rounded-3xl bg-navy text-greyblue shadow-2xl">
                <Icon name="bus" className="h-16 w-16" />
              </div>
            )}
          </motion.div>
        </div>

        {/* Search bar (overlaps the hero / next section) */}
        <motion.div
          className="relative z-10 pb-14"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.6 }}
        >
          <HeroSearch stops={stops} features={homepage.searchFeatures} />
        </motion.div>
      </div>
    </section>
  );
}
