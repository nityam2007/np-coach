import Link from "next/link";
import type { ComponentProps } from "react";

/**
 * Single source of truth for CTA styling. Four variants, two sizes — nothing else.
 *  - primary:   solid accent — the ONE main action in a viewport
 *  - secondary: white + border — supporting action on light surfaces
 *  - inverse:   white — main action on dark navy bands
 *  - ghostDark: outline — supporting action on dark navy bands
 * Use `<ButtonLink>` for navigation and `<Button>` for real buttons (forms, controls).
 */
const base =
  "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none";

const sizes = {
  md: "px-6 py-3",
  sm: "px-5 py-2.5 text-sm",
} as const;

const variants = {
  primary: "bg-accent text-white shadow-sm shadow-accent/20 hover:bg-brand-hover hover:shadow-md",
  secondary: "border border-navy/15 bg-white text-navy shadow-sm hover:border-accent/40 hover:bg-navy hover:text-white",
  inverse: "bg-white text-navy shadow-sm shadow-black/10 hover:shadow-md",
  ghostDark: "border border-white/20 text-offwhite hover:bg-white/10",
} as const;

export type ButtonVariant = keyof typeof variants;
export type ButtonSize = keyof typeof sizes;

export function buttonCls(variant: ButtonVariant = "primary", size: ButtonSize = "md", className = "") {
  return `${base} ${sizes[size]} ${variants[variant]} ${className}`.trim();
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <Link {...props} className={buttonCls(variant, size, className)} />;
}

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  type = "button",
  ...props
}: ComponentProps<"button"> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <button {...props} type={type} className={buttonCls(variant, size, className)} />;
}
