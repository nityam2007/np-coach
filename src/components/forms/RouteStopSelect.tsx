"use client";

export interface RouteStopOption { code: string; name: string }

/** Native select provides keyboard, touch, typeahead and screen-reader behaviour. */
export function RouteStopSelect({ name, value, onChange, options, ariaLabel, buttonClassName = "" }: { name?: string; value: string; onChange: (value: string) => void; options: RouteStopOption[]; ariaLabel: string; buttonClassName?: string }) {
  return (
    <select
      name={name}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      aria-label={ariaLabel}
      className={`w-full ${buttonClassName}`}
    >
      {options.map((option) => (
        <option key={option.code} value={option.code}>{option.name}</option>
      ))}
    </select>
  );
}