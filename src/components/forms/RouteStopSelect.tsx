"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";

export interface RouteStopOption { code: string; name: string }

/** Consistent in-page listbox used by both Daily Express selectors. */
export function RouteStopSelect({ name, value, onChange, options, ariaLabel, buttonClassName = "" }: { name?: string; value: string; onChange: (value: string) => void; options: RouteStopOption[]; ariaLabel: string; buttonClassName?: string }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.code === value);

  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  return (
    <div ref={root} className="relative min-w-0">
      {name && <input type="hidden" name={name} value={value} />}
      <button type="button" aria-label={ariaLabel} aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((current) => !current)} onKeyDown={(event) => { if (event.key === "Escape") setOpen(false); }} className={`flex w-full items-center justify-between gap-2 text-left ${buttonClassName}`}>
        <span className="truncate">{selected?.name ?? "Choose a stop"}</span><Icon name="chevronDown" className={`h-4 w-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <ul role="listbox" aria-label={ariaLabel} className="absolute left-0 top-full z-[70] mt-2 max-h-64 min-w-full overflow-y-auto rounded-xl border border-navy/10 bg-white p-1.5 shadow-xl shadow-navy/15 sm:min-w-64">
          {options.map((option) => (
            <li key={option.code} role="option" aria-selected={option.code === value}>
              <button type="button" onClick={() => { onChange(option.code); setOpen(false); }} className={`w-full rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${option.code === value ? "bg-accent text-white" : "text-navy hover:bg-tint-soft"}`}>{option.name}</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}