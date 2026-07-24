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

      {/* Routes from the hub to each coverage node — a slow dash flow suggests live travel */}
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
        >
          <animate attributeName="stroke-dashoffset" from="0" to="-14" dur="1.4s" begin={`${i * 0.18}s`} repeatCount="indefinite" />
        </line>
      ))}

      {/* Coverage nodes — each fades up in a gentle pulse */}
      {nodes.slice(1).map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="4.5" className="fill-white stroke-accent" strokeWidth="2">
          <animate attributeName="r" values="4.5;5.5;4.5" dur="3s" begin={`${i * 0.25}s`} repeatCount="indefinite" />
        </circle>
      ))}

      {/* Hub with a live ping ring */}
      <circle cx={hx} cy={hy} r="9" className="fill-accent/30">
        <animate attributeName="r" values="9;22" dur="2.4s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.6;0" dur="2.4s" repeatCount="indefinite" />
      </circle>
      <circle cx={hx} cy={hy} r="9" className="fill-accent" />
      <circle cx={hx} cy={hy} r="9" className="fill-none stroke-accent/40" strokeWidth="6" />
    </svg>
  );
}

/** Nationwide-coverage card: copy + CTA + network map + CMS-driven area pills. */
export function CoverageMap({ block, areas }: { block: CoverageBlock; areas: string[] }) {
  return (
    <div className="flex h-full flex-col rounded-3xl border border-greyblue/20 bg-gradient-to-b from-white to-[#f6f8fe] p-8 shadow-sm shadow-navy/5 transition-shadow hover:shadow-lg hover:shadow-navy/10 lg:p-10">
      <Eyebrow shiny>{block.eyebrow}</Eyebrow>
      <h2 className="mt-3 font-display text-2xl font-bold text-navy sm:text-3xl">{block.heading}</h2>
      <p className="mt-3 text-navy/60">{block.body}</p>

      <Link
        href={block.cta.href}
        className="group mt-6 inline-flex w-fit items-center gap-2 rounded-xl border border-navy/15 bg-white px-5 py-3 text-sm font-semibold text-navy shadow-sm transition-all hover:border-accent/40 hover:bg-navy hover:text-white active:scale-[0.98]"
      >
        {block.cta.label}
        <Icon name="arrowRight" className="h-4 w-4 transition-transform group-hover:translate-x-1" />
      </Link>

      {areas.length > 0 && (
        <>
          <div className="animate-float relative mx-auto mt-8 h-56 w-full max-w-xs">
            <CoverageArt count={areas.length} />
          </div>
          <ul className="mt-6 flex flex-wrap gap-2">
            {areas.map((area) => (
              <li
                key={area}
                className="group inline-flex cursor-default items-center gap-1.5 rounded-full border border-transparent bg-navy/5 px-3 py-1 text-xs font-medium text-navy/70 transition-colors hover:border-accent/30 hover:bg-accent/10 hover:text-navy"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-accent transition-transform group-hover:scale-150" aria-hidden="true" />
                {area}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
