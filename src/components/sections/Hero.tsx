"use client";

import Link from "next/link";
import Image from "next/image";
import { useReducedMotion } from "motion/react";
import { useRef, useState, useSyncExternalStore } from "react";
import type { SiteSettings } from "@/lib/directus";
import { assetUrl } from "@/lib/directus";
import type { Stop } from "@/lib/site-config";
import { HeroSearch } from "@/components/sections/HeroSearch";
import { Icon } from "@/components/ui/Icon";

type NetworkInformation = {
  saveData?: boolean;
  addEventListener?: (type: "change", listener: () => void) => void;
  removeEventListener?: (type: "change", listener: () => void) => void;
};

function connection(): NetworkInformation | undefined {
  return (navigator as Navigator & { connection?: NetworkInformation }).connection;
}

function subscribeToSaveData(onChange: () => void) {
  const current = connection();
  current?.addEventListener?.("change", onChange);
  return () => current?.removeEventListener?.("change", onChange);
}

const saveDataSnapshot = () => Boolean(connection()?.saveData);
const saveDataServerSnapshot = () => true;

/** Keep the highlighted phrase readable over the dark video overlay. */
function withHighlight(text: string, word: string) {
  const idx = word ? text.lastIndexOf(word) : -1;
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <span className="text-blue-200">{word}</span>
      {text.slice(idx + word.length)}
    </>
  );
}

/** Full-bleed media hero. Presentation changes do not alter stored CMS content. */
export function Hero({ settings, stops }: { settings: SiteSettings; stops: Stop[] }) {
  const { homepage } = settings;
  const coach = assetUrl(settings.heroImage);
  const video = assetUrl(settings.heroVideo);
  const reduce = useReducedMotion();

  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const saveData = useSyncExternalStore(subscribeToSaveData, saveDataSnapshot, saveDataServerSnapshot);
  const displayVideo = Boolean(video && !reduce && !saveData && !videoFailed);

  async function toggleVideo() {
    const element = videoRef.current;
    if (!element) return;
    if (element.paused) {
      try {
        if (element.ended) element.currentTime = 0;
        element.muted = true;
        await element.play();
      } catch {
        setVideoFailed(true);
      }
    } else {
      element.pause();
    }
  }

  return (
    <section className="relative isolate" aria-labelledby="homepage-hero-heading">
      <div className="relative flex min-h-[calc(100dvh-5rem)] items-center bg-navy">
        {/* The media is decorative; keep controls and copy outside this layer. */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          {displayVideo ? (
            <video
              id="homepage-hero-video"
              ref={videoRef}
              src={video ?? undefined}
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              poster={coach ?? undefined}
              className="absolute inset-0 h-full w-full object-cover"
              onPlay={() => setVideoPlaying(true)}
              onPause={() => setVideoPlaying(false)}
              onError={() => setVideoFailed(true)}
            />
          ) : coach ? (
            <Image src={coach} alt="" fill priority sizes="100vw" className="object-cover" />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-r from-navy/90 via-navy/65 to-navy/25" />
          <div className="absolute inset-0 bg-gradient-to-t from-navy via-transparent to-navy/20" />
        </div>

        {displayVideo && (
          <button
            type="button"
            onClick={toggleVideo}
            aria-controls="homepage-hero-video"
            className="absolute right-4 top-5 z-10 min-h-11 rounded-full border border-white/30 bg-navy/70 px-4 text-xs font-semibold text-white backdrop-blur-sm transition-colors hover:bg-navy focus-visible:outline-white sm:right-6 sm:top-6"
          >
            {videoPlaying ? "Pause video" : "Play video"}
          </button>
        )}

        <div className="relative mx-auto w-full max-w-7xl px-5 pt-24 pb-28 sm:px-6 sm:pt-28 sm:pb-32 lg:pb-44">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-100 sm:text-sm">
              {homepage.heroEyebrow}
            </p>
            <h1 id="homepage-hero-heading" className="mt-5 text-balance font-display text-[clamp(2.5rem,5.5vw,4.75rem)] font-semibold leading-[1.04] tracking-tight text-white">
              {withHighlight(settings.tagline, homepage.heroHighlight)}
            </h1>
            <p className="mt-6 max-w-lg text-base leading-relaxed text-white/85 sm:text-lg">{settings.subtitle}</p>

            <div className="mt-8 flex flex-wrap gap-3 sm:mt-9">
              <Link
                href={homepage.heroPrimaryCta.href}
                className="group inline-flex min-h-12 items-center justify-center gap-3 rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-hover focus-visible:outline-white sm:px-6 sm:text-base"
              >
                {homepage.heroPrimaryCta.label}
                <Icon name="arrowRight" className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href={homepage.heroSecondaryCta.href}
                className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/50 bg-navy/20 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-white hover:text-navy focus-visible:outline-white sm:px-6 sm:text-base"
              >
                {homepage.heroSecondaryCta.label}
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop straddles the video edge by half the card's own height.
          Keep the tall mobile form in normal flow below the video. */}
      <div className="relative mx-auto -mt-12 max-w-7xl px-4 pb-10 sm:px-6 lg:mt-0 lg:-translate-y-1/2 lg:pb-0">
        <HeroSearch stops={stops} compact />
      </div>
    </section>
  );
}
