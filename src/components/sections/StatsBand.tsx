import type { Stat } from "@/lib/site-config";

/** Navy stats card (years, passengers, journeys, satisfaction) — the right column of
 *  the clients section. Self-contained so it drops into a grid cell. Each stat rises in
 *  as it scrolls into view (CSS `.reveal`) and the number picks up the accent on hover. */
export function StatsBand({ stats }: { stats: Stat[] }) {
  if (stats.length === 0) return null;
  return (
    <div className="relative grid h-full grid-cols-2 content-center gap-6 overflow-hidden rounded-3xl bg-gradient-to-br from-navy via-navy to-brand-deep p-8 text-offwhite shadow-md shadow-navy/10 lg:p-10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full bg-accent/20 blur-3xl"
      />
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="group rounded-2xl p-3 transition-colors hover:bg-white/5"
        >
          <div className="font-display text-3xl font-bold tracking-tight tabular-nums transition-colors group-hover:text-sky-400 sm:text-4xl">
            {stat.value}
          </div>
          <div className="mt-1 text-sm text-greyblue">{stat.label}</div>
        </div>
      ))}
    </div>
  );
}
