"use client";

import { useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import type { Testimonial, HeroRating } from "@/lib/site-config";
import { assetUrl } from "@/lib/directus";
import { Eyebrow, Stars } from "@/components/ui/Eyebrow";
import { Icon } from "@/components/ui/Icon";

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

/** Testimonials block (left column of the clients section): rating header + a quote
 *  card carousel with avatars. Self-contained so it drops into a grid cell. */
export function TestimonialCarousel({
  testimonials,
  eyebrow,
  heading,
  rating,
}: {
  testimonials: Testimonial[];
  eyebrow: string;
  heading: string;
  rating: HeroRating;
}) {
  const [index, setIndex] = useState(0);
  if (testimonials.length === 0) return null;

  const count = testimonials.length;
  const current = testimonials[index];
  const avatar = assetUrl(current.image);
  const go = (next: number) => setIndex((next + count) % count);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow shiny>{eyebrow}</Eyebrow>
          <h2 className="mt-3 font-display text-2xl font-bold text-navy sm:text-3xl">{heading}</h2>
        </div>
        <div className="flex items-center gap-2">
          <Stars rating={5} />
          <span className="text-sm font-medium text-navy/70">
            {rating.score} {rating.reviews}
          </span>
        </div>
      </div>

      <div className="relative mt-6 min-h-[16rem]">
        <AnimatePresence mode="wait">
          <motion.figure
            key={index}
            initial={{ opacity: 0, x: 30, filter: "blur(6px)" }}
            animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, x: -30, filter: "blur(6px)" }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="rounded-2xl border border-greyblue/20 bg-white p-6 shadow-sm shadow-navy/5 sm:p-8"
          >
            <div className="flex items-center justify-between">
              <Icon name="quote" className="h-8 w-8 text-accent/30" />
              <Stars rating={current.rating ?? 5} />
            </div>
            <blockquote className="mt-3 font-display text-lg leading-relaxed text-navy sm:text-xl">
              {current.quote}
            </blockquote>
            <figcaption className="mt-6 flex items-center gap-3">
              {avatar ? (
                <Image
                  src={avatar}
                  alt={current.author}
                  width={48}
                  height={48}
                  className="h-12 w-12 rounded-full object-cover"
                />
              ) : (
                <span className="grid h-12 w-12 place-items-center rounded-full bg-navy font-display text-sm font-bold text-offwhite">
                  {initials(current.author)}
                </span>
              )}
              <span>
                <span className="block font-semibold text-navy">{current.author}</span>
                <span className="block text-xs text-navy/60">
                  {current.role}
                  {current.company ? `, ${current.company}` : ""}
                </span>
              </span>
            </figcaption>
          </motion.figure>
        </AnimatePresence>
      </div>

      {count > 1 && (
        <div className="mt-6 flex items-center gap-4">
          <button
            type="button"
            onClick={() => go(index - 1)}
            aria-label="Previous testimonial"
            className="grid h-10 w-10 place-items-center rounded-full border border-greyblue/30 bg-white text-navy transition-colors hover:bg-navy hover:text-white"
          >
            <Icon name="chevronLeft" className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => go(index + 1)}
            aria-label="Next testimonial"
            className="grid h-10 w-10 place-items-center rounded-full border border-greyblue/30 bg-white text-navy transition-colors hover:bg-navy hover:text-white"
          >
            <Icon name="chevronRight" className="h-5 w-5" />
          </button>
          <div className="flex gap-2">
            {testimonials.map((t, i) => (
              <button
                key={t.author + i}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Go to testimonial ${i + 1}`}
                aria-current={i === index}
                className={`h-2.5 rounded-full transition-all ${
                  i === index ? "w-6 bg-accent" : "w-2.5 bg-greyblue/40 hover:bg-greyblue/70"
                }`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
