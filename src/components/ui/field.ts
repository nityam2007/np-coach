/**
 * Single source of truth for form-field styling (inputs, selects, textareas share it).
 * 16px text (no iOS zoom, comfortable reading), visible focus ring, generous tap target.
 */
export const inputCls =
  "mt-1 w-full rounded-lg border border-greyblue/40 bg-white px-3.5 py-2.5 text-base text-navy transition-colors placeholder:text-navy/40 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20";

export const labelCls = "text-sm font-semibold text-navy";

export const fieldErrorCls = "mt-1 block text-xs font-normal text-red-600";
