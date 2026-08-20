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
      <ul className="grid grid-cols-2 overflow-hidden rounded-2xl border border-greyblue/20 bg-white shadow-sm shadow-navy/5 sm:grid-cols-3 lg:grid-cols-6">
        {items.map((name) => {
          const src = assetUrl(logos[name]);
          return (
            <li
              key={name}
              className="group flex min-h-24 min-w-0 items-center justify-center overflow-hidden border-b border-r border-greyblue/15 p-4 [border-right-width:1px] sm:min-h-28"
            >
              {src ? (
                <Image
                  src={src}
                  alt={name}
                  width={150}
                  height={56}
                  className="max-h-12 max-w-full object-contain opacity-100 transition-transform duration-300 group-hover:scale-105"
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
