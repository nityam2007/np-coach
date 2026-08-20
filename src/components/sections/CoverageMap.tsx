import Link from "next/link";
import type { CoverageBlock } from "@/lib/site-config";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Icon } from "@/components/ui/Icon";
import { TacticalGlobe } from "@/components/sections/TacticalGlobe";

/** Nationwide coverage card with an interactive globe and one verified UK depot pin. */
export function CoverageMap({ block, areas, depot }: { block: CoverageBlock; areas: string[]; depot: string }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-greyblue/20 bg-gradient-to-br from-white via-white to-tint p-8 shadow-sm shadow-navy/5 lg:p-10">
      <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <div>
          <Eyebrow>{block.eyebrow}</Eyebrow>
          <h2 className="mt-3 max-w-xl font-display text-3xl font-bold text-navy sm:text-4xl">{block.heading}</h2>
          <p className="mt-4 max-w-lg text-navy/70">{block.body}</p>
          <Link href={block.cta.href} className="group mt-7 inline-flex w-fit items-center gap-2 rounded-xl border border-navy/15 bg-white px-5 py-3 text-sm font-semibold text-navy shadow-sm transition-all hover:border-accent/40 hover:bg-navy hover:text-white active:scale-[0.98]">
            {block.cta.label}
            <Icon name="arrowRight" className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
        <div className="rounded-2xl border border-greyblue/15 bg-navy p-4 shadow-inner sm:p-6">
          <TacticalGlobe depot={depot} />
          {areas.length > 0 && (
            <ul className="mt-2 flex flex-wrap justify-center gap-2">
              {areas.map((area) => <li key={area} className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-greyblue">{area}</li>)}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}