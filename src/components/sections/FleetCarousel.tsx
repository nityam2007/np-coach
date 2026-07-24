"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { FleetVehicle, Cta } from "@/lib/site-config";
import { assetUrl } from "@/lib/directus";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { BorderBeam } from "@/components/ui/BorderBeam";
import { Icon } from "@/components/ui/Icon";
import { Reveal, Tilt } from "@/components/ui/motion";
import { featureIcon } from "@/lib/feature-icon";

/** Homepage fleet section: left copy + a carousel of one vehicle at a time (photo + spec). */
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

  return (
    <section className="bg-white">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-20">
        <div className="grid gap-10 lg:grid-cols-12 lg:items-center">
          <Reveal className="lg:col-span-4">
            <Eyebrow shiny>{eyebrow}</Eyebrow>
            <h2 className="mt-3 font-display text-3xl font-bold text-navy sm:text-4xl">{heading}</h2>
            <p className="mt-4 text-navy/60">{body}</p>
            <Link
              href={cta.href}
              className="group mt-6 inline-flex items-center gap-2 rounded-xl border border-navy/15 bg-white px-5 py-3 font-semibold text-navy shadow-sm transition-all hover:border-accent/40 hover:bg-navy hover:text-white active:scale-[0.98]"
            >
              {cta.label}
              <Icon name="arrowRight" className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </Reveal>

          <Reveal delay={0.12} className="lg:col-span-8">
            <Tilt max={5}>
            <div
              className="relative rounded-3xl bg-gradient-to-br from-[#eef2fb] to-white p-4 shadow-xl shadow-navy/10 ring-1 ring-greyblue/15 sm:p-6"
              onMouseEnter={() => setPaused(true)}
              onMouseLeave={() => setPaused(false)}
              onFocusCapture={() => setPaused(true)}
              onBlurCapture={() => setPaused(false)}
            >
              <BorderBeam duration={8} />
              <div className="grid items-center gap-6 sm:grid-cols-2">
                <div className="group relative aspect-[4/3] overflow-hidden rounded-2xl bg-white ring-1 ring-navy/5">
                  {img ? (
                    <>
                      <Image
                        key={vehicle.slug}
                        src={img}
                        alt={`${vehicle.name} coach`}
                        fill
                        sizes="(max-width: 1024px) 100vw, 40vw"
                        className="object-cover transition-transform duration-700 group-hover:scale-105 motion-safe:animate-[rise-in_0.6s_both]"
                      />
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-navy/25 via-transparent to-transparent" />
                    </>
                  ) : (
                    <div className="grid h-full place-items-center text-greyblue">
                      <Icon name="bus" className="h-14 w-14" />
                    </div>
                  )}
                </div>

                <div className="px-1 sm:px-3">
                  <h3 className="font-display text-xl font-bold text-navy sm:text-2xl">{vehicle.name}</h3>
                  <p className="mt-1 font-semibold text-accent">{vehicle.seats} Seats</p>
                  <ul className="mt-5 space-y-2">
                    {vehicle.features.slice(0, 4).map((f) => (
                      <li
                        key={f}
                        className="group/spec flex items-center gap-3 rounded-lg px-1.5 py-1 text-sm text-navy/80 transition-colors hover:bg-accent/[0.04]"
                      >
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-accent/10 text-accent transition-colors group-hover/spec:bg-accent group-hover/spec:text-white">
                          <Icon name={featureIcon(f)} className="h-4 w-4" />
                        </span>
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {count > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => go(index - 1)}
                    aria-label="Previous vehicle"
                    className="group/nav absolute left-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-greyblue/25 bg-white text-navy shadow-md transition-colors hover:border-accent hover:bg-navy hover:text-white active:scale-90 sm:grid"
                  >
                    <Icon name="chevronLeft" className="h-5 w-5 transition-transform group-hover/nav:-translate-x-0.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => go(index + 1)}
                    aria-label="Next vehicle"
                    className="group/nav absolute right-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-greyblue/25 bg-white text-navy shadow-md transition-colors hover:border-accent hover:bg-navy hover:text-white active:scale-90 sm:grid"
                  >
                    <Icon name="chevronRight" className="h-5 w-5 transition-transform group-hover/nav:translate-x-0.5" />
                  </button>

                  <div className="mt-6 flex justify-center gap-2">
                    {fleet.map((v, i) => (
                      <button
                        key={v.slug}
                        type="button"
                        onClick={() => setIndex(i)}
                        aria-label={`Show ${v.name}`}
                        aria-current={i === index}
                        className={`h-2.5 rounded-full transition-all ${
                          i === index ? "w-6 bg-accent" : "w-2.5 bg-greyblue/40 hover:bg-greyblue/70"
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
            </Tilt>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
