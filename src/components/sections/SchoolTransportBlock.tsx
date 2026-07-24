import Link from "next/link";
import Image from "next/image";
import type { HomeSchoolBlock } from "@/lib/site-config";
import { assetUrl } from "@/lib/directus";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Icon } from "@/components/ui/Icon";

/** Navy school-transport highlight card: copy + safeguarding checklist + photo. */
export function SchoolTransportBlock({ block, image }: { block: HomeSchoolBlock; image: string | null }) {
  const photo = assetUrl(image);
  return (
    <div className="relative h-full overflow-hidden rounded-3xl bg-gradient-to-br from-navy via-navy to-[#161838] p-8 text-offwhite shadow-xl shadow-navy/30 lg:p-10">
      {/* Depth: faint grid + accent glow bleeding from the corner. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:linear-gradient(white_1px,transparent_1px),linear-gradient(90deg,white_1px,transparent_1px)] [background-size:28px_28px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-accent/25 blur-3xl"
      />

      <div className="relative grid h-full gap-8 sm:grid-cols-2 sm:items-stretch">
        {/* Left column fills the full card height: header, then the checklist grows to
            take up the slack, then a trust footer + CTA pinned to the bottom. */}
        <div className="flex h-full flex-col">
          <Eyebrow className="text-sky-400">{block.eyebrow}</Eyebrow>
          <h2 className="mt-3 font-display text-2xl font-bold sm:text-3xl">{block.heading}</h2>
          <p className="mt-3 text-sm text-greyblue">{block.body}</p>

          <ul className="mt-6 grid flex-1 auto-rows-min grid-cols-1 content-center gap-x-4 gap-y-2.5 sm:grid-cols-2">
            {block.highlights.map((h) => (
              <li
                key={h}
                className="flex items-start gap-2 rounded-lg px-2 py-1.5 text-sm font-medium transition-colors hover:bg-white/5"
              >
                <Icon name="checkCircle" className="mt-0.5 h-5 w-5 shrink-0 text-sky-400" />
                {h}
              </li>
            ))}
          </ul>

          {/* Trust footer + CTA — anchored to the bottom so the space near the button is used. */}
          <div className="mt-6 border-t border-white/10 pt-6">
            <div className="flex items-center gap-4 text-xs font-medium text-greyblue">
              <span className="inline-flex items-center gap-1.5">
                <Icon name="shield" className="h-4 w-4 text-sky-400" />
                Fully insured
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Icon name="checkCircle" className="h-4 w-4 text-sky-400" />
                DfT compliant
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Icon name="star" className="h-4 w-4 text-sky-400" />
                Since 1999
              </span>
            </div>
            <Link
              href={block.cta.href}
              className="group mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-navy shadow-lg shadow-black/20 transition-all hover:shadow-xl hover:shadow-black/30 active:scale-[0.98]"
            >
              {block.cta.label}
              <Icon name="arrowRight" className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>

        {/* Image stretches to the full card height (no fixed aspect) so both columns match. */}
        <div className="group relative min-h-[22rem] overflow-hidden rounded-2xl bg-white/5 ring-1 ring-white/10">
          {photo ? (
            <>
              <Image
                src={photo}
                alt="Students boarding an NP Coaches school service"
                fill
                sizes="(max-width: 1024px) 100vw, 30vw"
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-navy/60 via-navy/10 to-transparent" />
              {/* Caption overlay on the photo — fills the previously-empty bottom band. */}
              <div className="absolute inset-x-4 bottom-4">
                <p className="text-sm font-semibold text-white">Safe every journey</p>
                <p className="text-xs text-greyblue">Trusted by local schools &amp; authorities</p>
              </div>
            </>
          ) : (
            <div className="grid h-full place-items-center text-greyblue">
              <Icon name="school" className="h-16 w-16" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
