"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";

export type GalleryImage = {
  src: string;
  alt: string;
};

/**
 * Thumbnail-first gallery. The larger image is requested only after a visitor opens
 * it, keeping image-led detail pages quick while still offering close inspection.
 */
export function ImageLightboxGallery({
  images,
  gridClassName = "grid gap-3 sm:grid-cols-2 lg:grid-cols-3",
  thumbnailSizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw",
  fit = "cover",
}: {
  images: GalleryImage[];
  gridClassName?: string;
  thumbnailSizes?: string;
  fit?: "cover" | "contain";
}) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const active = activeIndex === null ? null : images[activeIndex];
  const hasMultiple = images.length > 1;

  useEffect(() => {
    if (activeIndex === null) return;
    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActiveIndex(null);
      if (event.key === "ArrowLeft" && hasMultiple) setActiveIndex((current) => (current === null ? null : (current - 1 + images.length) % images.length));
      if (event.key === "ArrowRight" && hasMultiple) setActiveIndex((current) => (current === null ? null : (current + 1) % images.length));
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [activeIndex, hasMultiple, images.length]);

  const move = (direction: -1 | 1) => {
    setActiveIndex((current) => (current === null ? null : (current + direction + images.length) % images.length));
  };

  return (
    <>
      <div className={gridClassName}>
        {images.map((image, index) => (
          <button
            key={image.src}
            type="button"
            onClick={() => setActiveIndex(index)}
            className="group relative aspect-[4/3] overflow-hidden rounded-2xl bg-white text-left shadow-sm shadow-navy/5 focus-visible:outline-offset-4"
            aria-label={`Open ${image.alt}`}
          >
            <Image
              src={image.src}
              alt={image.alt}
              fill
              sizes={thumbnailSizes}
              className={`transition-transform duration-500 group-hover:scale-105 ${fit === "contain" ? "object-contain p-2" : "object-cover"}`}
            />
            <span className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 bg-gradient-to-t from-navy/80 via-navy/45 to-transparent px-4 pb-3 pt-10 text-sm font-semibold text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
              Quick preview <Icon name="search" className="h-4 w-4" />
            </span>
          </button>
        ))}
      </div>

      {active && activeIndex !== null && (
        <div
          className="fixed inset-0 z-[100] grid place-items-center bg-navy/95 p-4 sm:p-8"
          role="dialog"
          aria-modal="true"
          aria-label={`${active.alt} preview`}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setActiveIndex(null);
          }}
        >
          <div className="relative h-full w-full max-w-6xl">
            <div className="absolute right-0 top-0 z-10 flex items-center gap-2">
              {hasMultiple && <span className="rounded-full bg-white/10 px-3 py-2 text-xs font-semibold text-offwhite">{activeIndex + 1} / {images.length}</span>}
              <button type="button" onClick={() => setActiveIndex(null)} className="grid h-10 w-10 place-items-center rounded-full bg-white text-xl leading-none text-navy shadow-sm transition-transform hover:scale-105" aria-label="Close image preview">×</button>
            </div>
            <div className="relative h-full w-full overflow-hidden rounded-2xl">
              <Image src={active.src} alt={active.alt} fill sizes="95vw" className="object-contain" priority />
            </div>
            {hasMultiple && (
              <>
                <button type="button" onClick={() => move(-1)} className="absolute left-0 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white text-navy shadow-lg transition-transform hover:scale-105 sm:-left-4" aria-label="Previous image"><Icon name="chevronLeft" className="h-6 w-6" /></button>
                <button type="button" onClick={() => move(1)} className="absolute right-0 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white text-navy shadow-lg transition-transform hover:scale-105 sm:-right-4" aria-label="Next image"><Icon name="chevronRight" className="h-6 w-6" /></button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
