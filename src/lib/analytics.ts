export const CONSENT_COOKIE = "np_consent";
export const CONSENT_EVENT = "np-consent-change";

export type ConsentChoice = "accepted" | "rejected";

type GtagCommand = [command: string, ...args: unknown[]];

declare global {
  interface Window {
    dataLayer?: IArguments[];
    gtag?: (...args: GtagCommand) => void;
    __npGaConfigured?: boolean;
  }
}

// Match Google's gtag queue: a command is an Arguments object, not an Array.
export function gtag(...command: GtagCommand): void;
export function gtag() {
  window.dataLayer ??= [];
  window.dataLayer.push(arguments);
}

/** Apply a visitor's choice before the Google script or page-view event runs. */
export function applyAnalyticsChoice(measurementId: string, pathname: string, choice: ConsentChoice | null): boolean {
  const rejected = choice === "rejected";
  (window as unknown as Record<string, boolean>)[`ga-disable-${measurementId}`] = rejected;
  const denied = {
    analytics_storage: "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  };

  if (rejected) {
    if (window.dataLayer) gtag("consent", "update", denied);
    clearAnalyticsCookies();
    return false;
  }

  window.gtag = gtag;
  const consent = { ...denied, analytics_storage: choice === "accepted" ? "granted" : "denied" };
  if (!window.__npGaConfigured) {
    // Unknown choice permits cookieless pings, never analytics or advertising cookies.
    gtag("consent", "default", denied);
    gtag("consent", "update", consent);
    gtag("js", new Date());
    const referrer = document.referrer ? new URL(document.referrer) : null;
    gtag("config", measurementId, {
      send_page_view: false,
      page_location: analyticsPageLocation(location.origin, pathname),
      page_referrer: referrer ? analyticsPageLocation(referrer.origin, referrer.pathname) : "",
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      cookie_flags: "SameSite=Lax;Secure",
    });
    window.__npGaConfigured = true;
  } else {
    gtag("consent", "update", consent);
  }
  return true;
}

function clearAnalyticsCookies() {
  const names = document.cookie.split(";").map((part) => part.trim().split("=", 1)[0])
    .filter((name) => name === "_ga" || name.startsWith("_ga_"));
  const labels = location.hostname.split(".");
  // Try host-only and parent domains; the browser rejects public suffixes itself.
  const domains = ["", ...labels.slice(0, -1).map((_, index) => `; Domain=${labels.slice(index).join(".")}`)];
  const secure = location.protocol === "https:" ? "; Secure" : "";
  for (const name of names) {
    for (const domain of domains) {
      document.cookie = `${name}=; Max-Age=0; Path=/${domain}; SameSite=Lax${secure}`;
    }
  }
}

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

/** Strip query strings, fragments and private ticket references from analytics URLs. */
export function analyticsPageLocation(origin: string, pathname: string): string {
  const safeOrigin = new URL(origin).origin;
  const safePath = (pathname.startsWith("/") ? pathname.split(/[?#]/, 1)[0] : "/")
    .replace(/^\/account\/ticket\/[^/]+\/?$/, "/account/ticket");
  return `${safeOrigin}${safePath}`;
}
