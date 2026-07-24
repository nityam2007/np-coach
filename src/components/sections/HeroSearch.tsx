"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { Stop, SearchFeature } from "@/lib/site-config";
import { Icon, type IconName } from "@/components/ui/Icon";
import { BorderBeam } from "@/components/ui/BorderBeam";

/**
 * Daily Express online booking widget (client-side, no reload) — mirrors the live site:
 * From/To stop dropdowns with a swap, a journey date and an optional return date, then
 * Search. Daily Express is the only bookable journey type (schools, tours, private hire
 * etc. are separate pages, linked from the nav/service cards), so there is no type picker.
 *
 * Submits to /daily-express-service/book with stop CODES + date (+ trip=return when a
 * return date is chosen); the booking page prices server-side. Nothing is priced client-side.
 * Reused in the hero (with trust features) and the closing CTA band (compact).
 */

const controlCls =
  "w-full cursor-pointer bg-transparent text-sm font-semibold text-navy outline-none";

function Field({ icon, label, children }: { icon: IconName; label: string; children: React.ReactNode }) {
  return (
    <div className="group flex min-w-0 items-center gap-3 px-4 py-3 transition-colors hover:bg-accent/[0.03]">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent/10 text-accent transition-transform group-hover:scale-110 group-focus-within:scale-110">
        <Icon name={icon} className="h-4.5 w-4.5" />
      </span>
      <label className="flex min-w-0 flex-1 flex-col">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-navy/50">{label}</span>
        {children}
      </label>
    </div>
  );
}

export function HeroSearch({
  stops,
  features = [],
  compact = false,
}: {
  stops: Stop[];
  features?: SearchFeature[];
  compact?: boolean;
}) {
  const router = useRouter();
  const [from, setFrom] = useState(stops[0]?.code ?? "");
  const [to, setTo] = useState(stops[stops.length - 1]?.code ?? "");
  const [date, setDate] = useState("");
  const [returnDate, setReturnDate] = useState("");

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const sameStop = Boolean(from) && from === to;
  const disabled = !from || !to || sameStop;

  function swap() {
    setFrom(to);
    setTo(from);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (disabled) return;
    const params = new URLSearchParams({ from, to });
    if (date) params.set("date", date);
    if (returnDate) params.set("trip", "return"); // a return date ⇒ round trip
    router.push(`/daily-express-service/book?${params}`);
  }

  return (
    <div className="w-full">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-navy/70">
        <Icon name="route" className="h-4 w-4 text-accent" />
        Daily Express — book your tickets
      </div>

      <form
        onSubmit={submit}
        className="relative grid divide-y divide-greyblue/20 rounded-2xl border border-greyblue/25 bg-white shadow-xl shadow-navy/10 ring-1 ring-inset ring-white/60 lg:grid-cols-[1fr_auto_1fr_1fr_1fr_auto] lg:divide-x lg:divide-y-0"
      >
        <BorderBeam duration={7} />
        <Field icon="mapPin" label="From">
          <select value={from} onChange={(e) => setFrom(e.target.value)} className={controlCls} aria-label="Departure stop">
            {stops.map((s) => (
              <option key={s.code} value={s.code}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>

        {/* Swap From/To */}
        <div className="flex items-center justify-center py-2 lg:px-1">
          <button
            type="button"
            onClick={swap}
            aria-label="Swap From and To"
            className="group grid h-9 w-9 place-items-center rounded-full border border-greyblue/30 bg-white text-navy shadow-sm transition-all hover:rotate-180 hover:border-accent hover:bg-navy hover:text-white active:scale-95"
          >
            <Icon name="swap" className="h-4 w-4" />
          </button>
        </div>

        <Field icon="mapPin" label="To">
          <select value={to} onChange={(e) => setTo(e.target.value)} className={controlCls} aria-label="Destination stop">
            {stops.map((s) => (
              <option key={s.code} value={s.code}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>

        <Field icon="calendar" label="Journey date">
          <input
            type="date"
            min={today}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={`${controlCls} font-semibold`}
            aria-label="Journey date"
          />
        </Field>

        <Field icon="calendar" label="Return date (optional)">
          <input
            type="date"
            min={date || today}
            value={returnDate}
            onChange={(e) => setReturnDate(e.target.value)}
            className={`${controlCls} font-semibold`}
            aria-label="Return date (optional)"
          />
        </Field>

        <div className="p-2 lg:flex lg:items-center">
          <button
            type="submit"
            disabled={disabled}
            className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-accent to-[#1e4fd6] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-accent/25 transition-all hover:shadow-xl hover:shadow-accent/30 hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none lg:h-full"
          >
            <Icon name="search" className="h-4 w-4 transition-transform group-hover:scale-110" />
            Search
          </button>
        </div>
      </form>

      {sameStop && (
        <p className="mt-2 px-1 text-xs font-medium text-red-600">Please choose two different stops.</p>
      )}

      {!compact && features.length > 0 && (
        <ul className="mt-6 grid gap-3 sm:grid-cols-3">
          {features.map((f) => (
            <li
              key={f.title}
              className="group flex items-center gap-3 rounded-xl border border-transparent px-3 py-2 transition-colors hover:border-greyblue/20 hover:bg-white/60"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-navy/5 text-accent transition-colors group-hover:bg-accent group-hover:text-white">
                <Icon name={f.icon as IconName} className="h-4.5 w-4.5" />
              </span>
              <span>
                <span className="block text-sm font-semibold text-navy">{f.title}</span>
                <span className="block text-xs text-navy/60">{f.blurb}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
