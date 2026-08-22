"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useReducedMotion } from "motion/react";
import type { ServiceCard } from "@/lib/site-config";
import { assetUrl } from "@/lib/directus";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Reveal } from "@/components/ui/motion";

/** Homepage services carousel — tinted band, centred heading + wide photo cards in an
 *  auto-scrolling snap track (3-up on desktop, 2 tablet, 1 mobile). Auto-advance pauses
 *  on hover/focus and under prefers-reduced-motion; swipe/arrows always work. */
export function ServiceCards({
  services,
  eyebrow,
  heading,
  body,
}: {
  services: ServiceCard[];
  eyebrow: string;
  heading: string;
  body: string;
}) {
  const track = useRef<HTMLUListElement>(null);
  const [paused, setPaused] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const reduce = useReducedMotion();

  /** Scroll one card in either direction; wraps to the start past the end. */
  const step = useCallback((dir: 1 | -1) => {
    const el = track.current;
    if (!el || el.children.length < 2) return;
    const cardWidth = (el.children[1] as HTMLElement).offsetLeft - (el.children[0] as HTMLElement).offsetLeft;
    const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 8;
    if (dir === 1 && atEnd) el.scrollTo({ left: 0, behavior: "smooth" });
    else el.scrollBy({ left: dir * cardWidth, behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (reduce || paused || userPaused || services.length < 2) return;
    const id = setInterval(() => step(1), 4000);
    return () => clearInterval(id);
  }, [reduce, paused, services.length, step, userPaused]);

  return (
    <section className="bg-tint-soft">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-20">
        <Reveal className="mx-auto max-w-2xl text-center">
          <Eyebrow>{eyebrow}</Eyebrow>
          <h2 className="mt-3 font-display text-3xl font-bold text-navy sm:text-4xl">{heading}</h2>
          <p className="mt-3 text-navy/70">{body}</p>
        </Reveal>

        <Reveal className="relative mt-12">
          {/* Pause while the visitor is reading/interacting with the track. */}
          <div
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onFocusCapture={() => setPaused(true)}
            onBlurCapture={() => setPaused(false)}
          >
            <ul
              ref={track}
              className="flex snap-x snap-mandatory gap-6 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              aria-label="Our services"
            >
              {services.map((service) => {
                const img = assetUrl(service.image);
                return (
                  <li
                    key={service.href + service.title}
                    className="w-[85%] shrink-0 snap-start sm:w-[calc(50%-0.75rem)] lg:w-[calc((100%-3rem)/3)]"
                  >
                    <Link
                      href={service.href}
                      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-greyblue/20 bg-white shadow-sm shadow-navy/5 transition duration-300 hover:-translate-y-1 hover:shadow-md hover:shadow-navy/10"
                    >
                      <div className="relative aspect-[16/10] w-full bg-navy/5">
                        {/* Inner wrapper clips the image/hover-scale; the badge sits outside it so
                            its overhang into the text area isn't cut off. */}
                        <div className="absolute inset-0 overflow-hidden">
                          {img ? (
                            <Image
                              src={img}
                              alt={service.imageAlt ?? service.title}
                              fill
                              sizes="(max-width: 640px) 85vw, (max-width: 1024px) 50vw, 33vw"
                              className="object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                          ) : (
                            <div className="grid h-full place-items-center text-greyblue">
                              <Icon name="bus" className="h-10 w-10" />
                            </div>
                          )}
                        </div>
                        <span className="absolute -bottom-5 left-5 z-10 grid h-11 w-11 place-items-center rounded-xl bg-accent text-white shadow-sm shadow-accent/20 ring-4 ring-white">
                          <Icon name={(service.icon as IconName) ?? "bus"} className="h-5 w-5" />
                        </span>
                      </div>
                      <div className="flex flex-1 flex-col p-6 pt-8">
                        <h3 className="font-display text-lg font-semibold text-navy">{service.title}</h3>
                        <p className="mt-2 flex-1 text-sm text-navy/70">{service.blurb}</p>
                        <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-accent">
                          Explore service
                          <Icon name="arrowRight" className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
            {services.length > 1 && (
              <button
                type="button"
                onClick={() => setUserPaused((value) => !value)}
                aria-pressed={userPaused}
                className="mt-4 rounded-full border border-navy/15 bg-white px-4 py-2 text-xs font-semibold text-navy hover:border-accent"
              >
                {userPaused ? "Resume carousel" : "Pause carousel"}
              </button>
            )}

            {services.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => step(-1)}
                  aria-label="Previous services"
                  className="absolute -left-4 top-1/2 hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-greyblue/25 bg-white text-navy shadow-sm shadow-navy/5 transition-colors hover:border-accent hover:bg-navy hover:text-white sm:grid"
                >
                  <Icon name="chevronLeft" className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => step(1)}
                  aria-label="Next services"
                  className="absolute -right-4 top-1/2 hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-greyblue/25 bg-white text-navy shadow-sm shadow-navy/5 transition-colors hover:border-accent hover:bg-navy hover:text-white sm:grid"
                >
                  <Icon name="chevronRight" className="h-5 w-5" />
                </button>
              </>
            )}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
