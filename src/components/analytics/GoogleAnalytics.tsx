"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  analyticsPageLocation,
  CONSENT_COOKIE,
  CONSENT_EVENT,
  isGoogleAnalyticsId,
  parseConsentCookie,
  type ConsentChoice,
} from "@/lib/analytics";

type GtagCommand = [command: string, ...args: unknown[]];

declare global {
  interface Window {
    dataLayer?: GtagCommand[];
    gtag?: (...args: GtagCommand) => void;
    __npGaConfigured?: boolean;
  }
}

function gtag(...args: GtagCommand) {
  window.dataLayer ??= [];
  window.dataLayer.push(args);
}

function setDisabled(measurementId: string, disabled: boolean) {
  (window as unknown as Record<string, boolean>)[`ga-disable-${measurementId}`] = disabled;
}

function clearAnalyticsCookies() {
  const names = document.cookie
    .split(";")
    .map((part) => part.trim().split("=", 1)[0])
    .filter((name) => name === "_ga" || name.startsWith("_ga_"));
  const labels = location.hostname.split(".");
  const registrableDomain = labels.length >= 3 ? `.${labels.slice(-3).join(".")}` : `.${location.hostname}`;
  const domains = ["", `; Domain=${location.hostname}`, `; Domain=${registrableDomain}`];

  for (const name of names) {
    for (const domain of domains) {
      document.cookie = `${name}=; Max-Age=0; Path=/${domain}; SameSite=Lax; Secure`;
    }
  }
}

function applyDeniedConsent(measurementId: string) {
  setDisabled(measurementId, true);
  if (window.dataLayer) {
    gtag("consent", "update", {
      analytics_storage: "denied",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    });
  }
  clearAnalyticsCookies();
}

function initialiseAnalytics(measurementId: string, pathname: string) {
  setDisabled(measurementId, false);
  window.gtag = gtag;
  const pageLocation = analyticsPageLocation(location.origin, pathname);

  if (!window.__npGaConfigured) {
    gtag("consent", "default", {
      analytics_storage: "denied",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    });
    gtag("consent", "update", {
      analytics_storage: "granted",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    });
    gtag("js", new Date());
    gtag("config", measurementId, {
      send_page_view: false,
      page_location: pageLocation,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      cookie_flags: "SameSite=Lax;Secure",
    });
    window.__npGaConfigured = true;
  } else {
    gtag("consent", "update", { analytics_storage: "granted" });
  }
}

export function GoogleAnalytics({ measurementId }: { measurementId?: string }) {
  const pathname = usePathname();
  const [enabled, setEnabled] = useState(false);
  const validId = isGoogleAnalyticsId(measurementId) ? measurementId : null;

  useEffect(() => {
    if (!validId) return;

    const applyChoice = (choice: ConsentChoice | null) => {
      if (choice === "accepted") {
        initialiseAnalytics(validId, pathname);
        setEnabled(true);
      } else {
        applyDeniedConsent(validId);
        setEnabled(false);
      }
    };
    applyChoice(parseConsentCookie(document.cookie));

    const handleConsent = (event: Event) => {
      applyChoice((event as CustomEvent<ConsentChoice>).detail);
    };
    window.addEventListener(CONSENT_EVENT, handleConsent);
    return () => window.removeEventListener(CONSENT_EVENT, handleConsent);
  }, [pathname, validId]);

  useEffect(() => {
    if (!enabled || !validId) return;
    const pageLocation = analyticsPageLocation(location.origin, pathname);
    gtag("set", { page_location: pageLocation, page_path: pathname });
    gtag("event", "page_view", {
      page_title: document.title,
      page_location: pageLocation,
      page_path: pathname,
    });
  }, [enabled, pathname, validId]);

  if (!enabled || !validId) return null;
  return (
    <Script
      id="google-analytics"
      src={`https://www.googletagmanager.com/gtag/js?id=${validId}`}
      strategy="afterInteractive"
    />
  );
}
