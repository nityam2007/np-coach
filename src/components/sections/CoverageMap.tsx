import Link from "next/link";
import type { CoverageBlock } from "@/lib/site-config";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Icon } from "@/components/ui/Icon";

/** Decorative constellation map: a hub (West London depot) linked to coverage nodes. */
const NODES: [number, number][] = [
  [168, 244], // hub — index 0
  [150, 300],
  [112, 250],
  [140, 196],
  [204, 208],
  [150, 148],
  [118, 108],
  [186, 92],
];

function CoverageArt({ count }: { count: number }) {
  const nodes = NODES.slice(0, Math.max(2, Math.min(count, NODES.length)));
  const [hx, hy] = nodes[0];
  return (
    <svg viewBox="0 0 300 360" className="h-full w-full" role="img" aria-label="Map of NP Coaches UK coverage">
      <defs>
        <pattern id="cov-dots" width="18" height="18" patternUnits="userSpaceOnUse">
          <circle cx="1.5" cy="1.5" r="1.5" className="fill-navy/10" />
        </pattern>
        <radialGradient id="cov-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" className="[stop-color:var(--color-accent)]" stopOpacity="0.28" />
          <stop offset="100%" className="[stop-color:var(--color-accent)]" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="300" height="360" fill="url(#cov-dots)" />
      <circle cx={hx} cy={hy} r="70" fill="url(#cov-glow)" />

      {/* Routes from the hub to each coverage node */}
      {nodes.slice(1).map(([x, y], i) => (
        <line
          key={i}
          x1={hx}
          y1={hy}
          x2={x}
          y2={y}
          className="stroke-accent/45"
          strokeWidth="1.5"
          strokeDasharray="3 4"
        />
      ))}

      {/* Coverage nodes */}
      {nodes.slice(1).map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="4.5" className="fill-white stroke-accent" strokeWidth="2" />
      ))}

      {/* Hub (West London depot) */}
      <circle cx={hx} cy={hy} r="9" className="fill-accent" />
      <circle cx={hx} cy={hy} r="9" className="fill-none stroke-accent/40" strokeWidth="6" />
    </svg>
  );
}

/** Nationwide-coverage card: copy + CTA + network map + CMS-driven area pills. */
export function CoverageMap({ block, areas, depot }: { block: CoverageBlock; areas: string[]; depot: string }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-greyblue/20 bg-gradient-to-br from-white via-white to-tint p-8 shadow-sm shadow-navy/5 lg:p-10">
      <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <div>
          <Eyebrow>{block.eyebrow}</Eyebrow>
          <h2 className="mt-3 max-w-xl font-display text-3xl font-bold text-navy sm:text-4xl">{block.heading}</h2>
          <p className="mt-4 max-w-lg text-navy/70">{block.body}</p>

          <Link
            href={block.cta.href}
            className="group mt-7 inline-flex w-fit items-center gap-2 rounded-xl border border-navy/15 bg-white px-5 py-3 text-sm font-semibold text-navy shadow-sm transition-all hover:border-accent/40 hover:bg-navy hover:text-white active:scale-[0.98]"
          >
            {block.cta.label}
            <Icon name="arrowRight" className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        <div className="rounded-2xl border border-greyblue/15 bg-white/70 p-5 sm:p-6">
          {areas.length > 0 && (
            <>
              <div className="relative mx-auto h-64 w-full max-w-sm sm:h-72">
                <CoverageArt count={areas.length} />
              </div>
              <div className="absolute left-1/2 top-[68%] -translate-x-1/2 rounded-full border border-accent/15 bg-white/90 px-3 py-1.5 text-xs font-semibold text-navy shadow-sm">
                <span className="inline-flex items-center gap-1.5"><Icon name="mapPin" className="h-3.5 w-3.5 text-accent" />{depot}</span>
              </div>
              <ul className="mt-5 flex flex-wrap justify-center gap-2">
                {areas.map((area) => (
                  <li
                    key={area}
                    className="group inline-flex cursor-default items-center gap-1.5 rounded-full border border-transparent bg-navy/5 px-3 py-1.5 text-xs font-medium text-navy/70 transition-colors hover:border-accent/30 hover:bg-accent/10 hover:text-navy"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-accent transition-transform group-hover:scale-150" aria-hidden="true" />
                    {area}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
