import type { ReactNode, SVGProps } from "react";

/**
 * Single source of truth for the site's inline SVG icons. Every glyph is drawn on a
 * 24×24 grid and inherits colour via `currentColor` and size via className (default
 * h-5 w-5), so callers style them with Tailwind. Line icons stroke; a few (star,
 * quote) fill — listed in FILLED.
 *
 * Usage: <Icon name="bus" className="h-6 w-6 text-accent" />
 */
export type IconName =
  | "bus"
  | "school"
  | "briefcase"
  | "camera"
  | "celebration"
  | "mapPin"
  | "users"
  | "calendar"
  | "bolt"
  | "tag"
  | "lock"
  | "shield"
  | "check"
  | "checkCircle"
  | "star"
  | "quote"
  | "arrowRight"
  | "arrowLeft"
  | "chevronLeft"
  | "chevronRight"
  | "chevronDown"
  | "phone"
  | "snow"
  | "seat"
  | "power"
  | "usb"
  | "luggage"
  | "wifi"
  | "table"
  | "tv"
  | "speaker"
  | "fridge"
  | "wc"
  | "route"
  | "swap"
  | "search"
  | "user"
  | "download"
  | "logout"
  | "ticket"
  | "facebook"
  | "instagram"
  | "x";

const GLYPHS: Record<IconName, ReactNode> = {
  bus: (
    <>
      <rect x="4" y="4" width="16" height="12" rx="2" />
      <path d="M4 10h16M7 16v1.5M17 16v1.5M7 7h10" />
      <circle cx="7.5" cy="18" r="1" />
      <circle cx="16.5" cy="18" r="1" />
    </>
  ),
  school: (
    <>
      <path d="M12 4 2 9l10 5 10-5-10-5Z" />
      <path d="M6 11.5V16c0 1 2.7 2.5 6 2.5s6-1.5 6-2.5v-4.5" />
      <path d="M22 9v5" />
    </>
  ),
  briefcase: (
    <>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18" />
    </>
  ),
  camera: (
    <>
      <path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" />
      <circle cx="12" cy="13" r="3.4" />
    </>
  ),
  celebration: (
    <>
      <path d="M2 22 8.5 9.5 15 16 2 22Z" />
      <path d="M13 8a3 3 0 0 0 3-3M16 11a3 3 0 0 1 3-3M18 4.5 19.5 3M21 8h1.5M14.5 3.5 15 2" />
    </>
  ),
  mapPin: (
    <>
      <path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.4" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" />
      <path d="M16 5.2A3 3 0 0 1 16 13M21 20c0-2.6-1.4-4.4-3.5-5" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 9h18M8 3v4M16 3v4" />
    </>
  ),
  bolt: <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />,
  tag: (
    <>
      <path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0l-7.2-7.2A2 2 0 0 1 3 12V5a2 2 0 0 1 2-2h7a2 2 0 0 1 1.4.6l7.2 7.2a2 2 0 0 1 0 2.6Z" />
      <circle cx="7.5" cy="7.5" r="1.2" />
    </>
  ),
  lock: (
    <>
      <rect x="4" y="10" width="16" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      <circle cx="12" cy="15.5" r="1.2" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3 5 6v5c0 4.3 2.9 8.3 7 9.5 4.1-1.2 7-5.2 7-9.5V6l-7-3Z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  check: <path d="M5 12.5 10 17 19 7" />,
  checkCircle: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12 2.5 2.5 5-5" />
    </>
  ),
  star: <path d="M12 3.5l2.6 5.3 5.9.8-4.3 4.1 1 5.8L12 16.9 6.8 19.4l1-5.8L3.5 9.6l5.9-.8L12 3.5Z" />,
  quote: (
    <path d="M9.5 8c-2.5.9-4 3-4 5.5V18h5v-5H7.2c0-1.4 1-2.6 2.5-3.2L9.5 8Zm9 0c-2.5.9-4 3-4 5.5V18h5v-5h-3.3c0-1.4 1-2.6 2.5-3.2L18.5 8Z" />
  ),
  arrowRight: <path d="M4 12h15M13 6l6 6-6 6" />,
  arrowLeft: <path d="M20 12H5M11 6l-6 6 6 6" />,
  chevronLeft: <path d="M15 6l-6 6 6 6" />,
  chevronRight: <path d="M9 6l6 6-6 6" />,
  chevronDown: <path d="M6 9l6 6 6-6" />,
  phone: (
    <path d="M6.5 3h3l1.5 4-2 1.5a12 12 0 0 0 5 5l1.5-2 4 1.5v3a2 2 0 0 1-2.2 2A16 16 0 0 1 4.5 5.2 2 2 0 0 1 6.5 3Z" />
  ),
  snow: <path d="M12 2v20M2 12h20M5 5l14 14M19 5 5 19" />,
  seat: (
    <>
      <path d="M5 12V7a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v5h6V7a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2Z" />
      <path d="M7 17v2M17 17v2" />
    </>
  ),
  power: (
    <>
      <path d="M9 3v5M15 3v5" />
      <path d="M7 8h10v3a5 5 0 0 1-10 0V8Z" />
      <path d="M12 16v5" />
    </>
  ),
  usb: (
    <>
      <circle cx="12" cy="20" r="1.4" />
      <path d="M12 18.6V4m-3.4 3 3.4-3 3.4 3M12 11h4.5V8.5" />
      <rect x="15" y="6" width="3" height="2.5" />
      <path d="M12 14H8v-2" />
      <circle cx="8" cy="11.5" r="1.2" />
    </>
  ),
  luggage: (
    <>
      <rect x="6" y="7" width="12" height="13" rx="2" />
      <path d="M9 7V5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 5v2M10 11v5M14 11v5M8 20v1.5M16 20v1.5" />
    </>
  ),
  wifi: (
    <>
      <path d="M5 9a11 11 0 0 1 14 0M7.5 12a7 7 0 0 1 9 0M10 15a3 3 0 0 1 4 0" />
      <circle cx="12" cy="18" r="1" />
    </>
  ),
  table: <path d="M4 10h16M6 10v8M18 10v8M4 10 7 6h10l3 4" />,
  tv: (
    <>
      <rect x="3" y="5" width="18" height="12" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </>
  ),
  speaker: (
    <>
      <path d="M4 10v4a1 1 0 0 0 1 1h2l6 4V5L7 9H5a1 1 0 0 0-1 1Z" />
      <path d="M16 9a4 4 0 0 1 0 6" />
    </>
  ),
  fridge: (
    <>
      <rect x="6" y="3" width="12" height="18" rx="2" />
      <path d="M6 10h12M10 6v2M10 13v3" />
    </>
  ),
  wc: <path d="M12 3c3 4 6 7 6 10a6 6 0 0 1-12 0c0-3 3-6 6-10Z" />,
  route: (
    <>
      <circle cx="6" cy="18" r="2.5" />
      <circle cx="18" cy="6" r="2.5" />
      <path d="M8.5 18H15a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h6.5" />
    </>
  ),
  swap: <path d="M4 8h13l-3.5-3.5M20 16H7l3.5 3.5" />,
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.6-3.6" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
    </>
  ),
  download: <path d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14" />,
  logout: <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l-5-5 5-5M15 12H5" />,
  facebook: <path d="M14 8h3V4h-3c-3.3 0-5 2-5 5v3H6v4h3v5h4v-5h3l1-4h-4V9c0-.7.3-1 1-1Z" />,
  instagram: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  x: <path d="M5 4 19 20M19 4 5 20" />,  ticket: (
    <>
      <path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2 2 2 0 0 0 0 4 2 2 0 0 1-2 2H5a2 2 0 0 1-2-2 2 2 0 0 0 0-4Z" />
      <path d="M15 6v2M15 12v2M15 16v2" />
    </>
  ),
};

const FILLED = new Set<IconName>(["star", "quote", "bolt"]);

export function Icon({
  name,
  className = "h-5 w-5",
  ...props
}: { name: IconName } & SVGProps<SVGSVGElement>) {
  const filled = FILLED.has(name);
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill={filled ? "currentColor" : "none"}
      stroke={filled ? "none" : "currentColor"}
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {/* Fall back to a neutral glyph if a CMS-supplied icon key isn't in the set. */}
      {GLYPHS[name] ?? GLYPHS.check}
    </svg>
  );
}
