"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  analyticsPageLocation,
  applyAnalyticsChoice,
  CONSENT_EVENT,
  gtag,
  isGoogleAnalyticsId,
  parseConsentCookie,
  type ConsentChoice,
} from "@/lib/analytics";

export function GoogleAnalytics({ measurementId }: { measurementId?: string }) {
  const pathname = usePathname();
  const [enabled, setEnabled] = useState(false);
  const validId = isGoogleAnalyticsId(measurementId) ? measurementId : null;

  useEffect(() => {
    if (!validId) return;

    const applyChoice = (choice: ConsentChoice | null) => {
      setEnabled(applyAnalyticsChoice(validId, pathname, choice));
    };
    applyChoice(parseConsentCookie(document.cookie));

    const handleConsent = (event: Event) => {
      applyChoice((event as CustomEvent<ConsentChoice>).detail);
    };
    window.addEventListener(CONSENT_EVENT, handleConsent);
    return () => window.removeEventListener(CONSENT_EVENT, handleConsent);
  }, [pathname, validId]);

  useEffect(() => {
    // Recheck the stored choice: a rejection can precede this effect's rerender.
    if (!enabled || !validId || parseConsentCookie(document.cookie) === "rejected") return;
    const pageLocation = analyticsPageLocation(location.origin, pathname);
    const pagePath = new URL(pageLocation).pathname;
    gtag("set", { page_location: pageLocation, page_path: pagePath });
    gtag("event", "page_view", {
      page_title: document.title,
      page_location: pageLocation,
      page_path: pagePath,
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
