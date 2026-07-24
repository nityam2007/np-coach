"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { FleetVehicle, Cta } from "@/lib/site-config";
import { assetUrl } from "@/lib/directus";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Icon } from "@/components/ui/Icon";
import { Reveal } from "@/components/ui/motion";
import { GridBackdrop } from "@/components/ui/Backdrops";
import { featureIcon } from "@/lib/feature-icon";

/** Homepage fleet section — a full-bleed navy showcase band: left copy + one vehicle
 *  at a time with a giant ghost seat-numeral, spec chips, and a seat-count selector
 *  rail (each pill jumps straight to that vehicle — clearer than anonymous dots). */
export function FleetCarousel({
  fleet,
  eyebrow,
  heading,
  body,
  cta,
}: {
  fleet: FleetVehicle[];
  eyebrow: string;
  heading: string;
  body: string;
  cta: Cta;
}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = fleet.length;

  // Auto-advance so the showcase feels alive; pauses on hover/focus. ponytail: plain
  // interval — no carousel lib for a single-item cross-fade.
  useEffect(() => {
    if (count < 2 || paused) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % count), 5000);
    return () => clearInterval(id);
  }, [count, paused]);

  if (fleet.length === 0) return null;

  const vehicle = fleet[index];
  const img = assetUrl(vehicle.image);
  const go = (next: number) => setIndex((next + count) % count);
  const pad = (n: number) => String(n).padStart(2, "0");
  const seatCounts = fleet.map((v) => v.seats);
  const minSeats = Math.min(...seatCounts);
  const maxSeats = Math.max(...seatCounts);

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-navy via-navy to-brand-deep">
      <GridBackdrop dark />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-accent/15 blur-3xl"
      />

      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-24">
        <div className="grid gap-10 lg:grid-cols-12 lg:items-center">
          <Reveal className="lg:col-span-4">
            <Eyebrow className="text-sky-400">{eyebrow}</Eyebrow>
            <h2 className="mt-3 font-display text-3xl font-bold text-offwhite sm:text-4xl">{heading}</h2>
            <p className="mt-4 text-greyblue">{body}</p>
            <Link
              href={cta.href}
              className="group mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 font-semibold text-navy shadow-sm shadow-black/10 transition-all hover:shadow-md active:scale-[0.98]"
            >
              {cta.label}
              <Icon name="arrowRight" className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>

            {/* Fleet-wide range strip — quick proof of breadth. */}
            <div className="mt-8 flex items-center gap-3 border-t border-white/10 pt-6 text-xs font-medium text-greyblue">
              <Icon name="bus" className="h-4 w-4 text-sky-400" />
              {minSeats}–{maxSeats} seats · Euro-6 · ULEZ-compliant
            </div>
          </Reveal>

          <Reveal delay={0.12} className="lg:col-span-8">
            <div
              className="relative"
              onMouseEnter={() => setPaused(true)}
              onMouseLeave={() => setPaused(false)}
              onFocusCapture={() => setPaused(true)}
              onBlurCapture={() => setPaused(false)}
            >
              {/* Giant ghost seat numeral behind the showcase — editorial depth. */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -top-14 right-2 select-none font-display text-[7rem] font-bold leading-none text-white/[0.05] sm:text-[10rem] lg:-top-20 lg:text-[13rem]"
              >
                {vehicle.seats}
              </div>

              <div className="relative rounded-3xl bg-white/5 p-4 ring-1 ring-white/10 backdrop-blur-sm sm:p-6">
                <div className="grid items-center gap-6 sm:grid-cols-2">
                  <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-white/5 ring-1 ring-white/10">
                    {img ? (
                      <>
                        <Image
                          key={vehicle.slug}
                          src={img}
                          alt={`${vehicle.name} coach`}
                          fill
                          sizes="(max-width: 1024px) 100vw, 40vw"
                          className="object-cover motion-safe:animate-[rise-in_0.6s_both]"
                        />
                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-navy/40 via-transparent to-transparent" />
                      </>
                    ) : (
                      <div className="grid h-full place-items-center text-greyblue/60">
                        <Icon name="bus" className="h-14 w-14" />
                      </div>
                    )}
                  </div>

                  <div className="px-1 sm:px-3">
                    <p className="inline-flex items-center gap-2 rounded-full bg-accent/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-sky-400 ring-1 ring-accent/30">
                      {vehicle.seats} seats
                    </p>
                    <h3 className="mt-3 font-display text-2xl font-bold text-offwhite sm:text-3xl">{vehicle.name}</h3>
                    <ul className="mt-5 grid gap-2">
                      {vehicle.features.slice(0, 4).map((f) => (
                        <li
                          key={f}
                          className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2 text-sm text-offwhite/90 ring-1 ring-white/10"
                        >
                          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-accent/20 text-sky-400">
                            <Icon name={featureIcon(f)} className="h-3.5 w-3.5" />
                          </span>
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Seat-count rail + counter + arrows — one control bar under the showcase. */}
              {count > 1 && (
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <div className="flex flex-wrap gap-2" role="tablist" aria-label="Choose a vehicle by seat count">
                    {fleet.map((v, i) => (
                      <button
                        key={v.slug}
                        type="button"
                        role="tab"
                        onClick={() => setIndex(i)}
                        aria-label={`Show ${v.name}`}
                        aria-selected={i === index}
                        className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                          i === index
                            ? "bg-accent text-white"
                            : "bg-white/5 text-greyblue ring-1 ring-white/15 hover:bg-white/10 hover:text-offwhite"
                        }`}
                      >
                        {v.seats}
                      </button>
                    ))}
                  </div>

                  <div className="ml-auto flex items-center gap-3">
                    <span className="text-xs font-medium tabular-nums text-greyblue">
                      {pad(index + 1)} / {pad(count)}
                    </span>
                    <button
                      type="button"
                      onClick={() => go(index - 1)}
                      aria-label="Previous vehicle"
                      className="grid h-9 w-9 place-items-center rounded-full bg-white/5 text-offwhite ring-1 ring-white/15 transition-colors hover:bg-white hover:text-navy"
                    >
                      <Icon name="chevronLeft" className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => go(index + 1)}
                      aria-label="Next vehicle"
                      className="grid h-9 w-9 place-items-center rounded-full bg-white/5 text-offwhite ring-1 ring-white/15 transition-colors hover:bg-white hover:text-navy"
                    >
                      <Icon name="chevronRight" className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
