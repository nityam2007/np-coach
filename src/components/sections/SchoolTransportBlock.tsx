import Link from "next/link";
import Image from "next/image";
import type { HomeSchoolBlock } from "@/lib/site-config";
import { assetUrl } from "@/lib/directus";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Icon } from "@/components/ui/Icon";

/** Premium school-transport highlight using the client-supplied image and soft depth. */
export function SchoolTransportBlock({ block, image, imageAlt }: { block: HomeSchoolBlock; image: string | null; imageAlt: string }) {
  const photo = assetUrl(image);
  return (
    <div className="relative h-full overflow-hidden rounded-3xl bg-gradient-to-br from-navy via-[#1c2f68] to-brand-deep p-8 text-offwhite shadow-md shadow-navy/10 lg:p-10">
      <div aria-hidden="true" className="pointer-events-none absolute -left-28 -top-32 h-80 w-80 rounded-full bg-accent/25 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-40 -right-28 h-96 w-96 rounded-full border-[56px] border-white/[0.035]" />
      <div aria-hidden="true" className="pointer-events-none absolute right-[30%] top-8 h-36 w-36 rounded-full border border-sky-300/10" />
      <div className="relative grid h-full gap-8 sm:grid-cols-2 sm:items-stretch">
        <div className="flex h-full flex-col">
          <Eyebrow className="text-sky-400">{block.eyebrow}</Eyebrow>
          <h2 className="mt-3 font-display text-2xl font-bold sm:text-3xl">{block.heading}</h2>
          <p className="mt-3 text-sm text-greyblue">{block.body}</p>
          <ul className="mt-6 grid flex-1 auto-rows-min grid-cols-1 content-center gap-x-4 gap-y-2.5 sm:grid-cols-2">
            {block.highlights.map((highlight) => <li key={highlight} className="flex items-start gap-2 rounded-lg bg-white/[0.035] px-3 py-2 text-sm font-medium"><Icon name="checkCircle" className="mt-0.5 h-5 w-5 shrink-0 text-sky-400" />{highlight}</li>)}
          </ul>
          <div className="mt-6 border-t border-white/10 pt-6">
            <Link href={block.cta.href} className="group inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-navy shadow-sm shadow-black/10 transition-all hover:shadow-md active:scale-[0.98]">{block.cta.label}<Icon name="arrowRight" className="h-4 w-4 transition-transform group-hover:translate-x-1" /></Link>
          </div>
        </div>
        <div className="group relative min-h-[22rem] overflow-hidden rounded-2xl bg-white/5 ring-1 ring-white/10">
          {photo ? <><Image src={photo} alt={imageAlt} fill sizes="(max-width: 1024px) 100vw, 30vw" className="object-cover transition-transform duration-700 group-hover:scale-105" /><div className="absolute inset-0 bg-gradient-to-t from-navy/65 via-transparent to-transparent" /></> : <div className="grid h-full place-items-center text-greyblue"><Icon name="school" className="h-16 w-16" /></div>}
        </div>
      </div>
    </div>
  );
}