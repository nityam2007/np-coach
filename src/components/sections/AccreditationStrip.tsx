import Image from "next/image";
import { assetUrl } from "@/lib/directus";
import { Reveal } from "@/components/ui/motion";

/**
 * Trust strip of accreditation badges in a floating white card with dividers between
 * items, under a small caption so certifications read as a deliberate section.
 * Renders the real badge image when mapped in settings.accreditation_logos;
 * falls back to the name in text otherwise.
 */
export function AccreditationStrip({ items, logos }: { items: string[]; logos: Record<string, string> }) {
  if (items.length === 0) return null;
  return (
    <Reveal as="section" className="mx-auto -mt-6 max-w-7xl px-4 py-6 sm:px-6">
      <p className="mb-3 text-center font-display text-xs font-semibold uppercase tracking-[0.18em] text-navy/70">
        Accredited, licensed &amp; regulated
      </p>
      <ul className="grid grid-cols-2 items-center gap-x-4 gap-y-6 rounded-2xl border border-greyblue/20 bg-white px-6 py-6 shadow-sm shadow-navy/5 sm:grid-cols-3 lg:flex lg:justify-between">
        {items.map((name) => {
          const src = assetUrl(logos[name]);
          return (
            <li
              key={name}
              className="group flex items-center justify-center px-2 lg:flex-1 lg:border-l lg:border-greyblue/15 lg:first:border-l-0"
            >
              {src ? (
                <Image
                  src={src}
                  alt={name}
                  width={150}
                  height={56}
                  className="h-9 w-auto object-contain opacity-70 grayscale transition-all duration-300 group-hover:scale-105 group-hover:opacity-100 group-hover:grayscale-0 sm:h-11"
                />
              ) : (
                <span className="text-center text-xs font-semibold uppercase tracking-wide text-navy/70 transition-colors group-hover:text-navy">
                  {name}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </Reveal>
  );
}
