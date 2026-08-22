export const CONSENT_COOKIE = "np_consent";
export const CONSENT_EVENT = "np-consent-change";

export type ConsentChoice = "accepted" | "rejected";

export function parseConsentCookie(cookieHeader: string): ConsentChoice | null {
  const value = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${CONSENT_COOKIE}=`))
    ?.slice(CONSENT_COOKIE.length + 1);

  return value === "accepted" || value === "rejected" ? value : null;
}

export function isGoogleAnalyticsId(value: string | undefined): value is string {
  return /^G-[A-Z0-9]+$/.test(value ?? "");
}

/** Analytics never receives query strings or fragments from transactional URLs. */
export function analyticsPageLocation(origin: string, pathname: string): string {
  const safeOrigin = new URL(origin).origin;
  const safePath = pathname.startsWith("/") ? pathname.split(/[?#]/, 1)[0] : "/";
  return `${safeOrigin}${safePath}`;
}
