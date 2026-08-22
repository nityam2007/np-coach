"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CONSENT_COOKIE,
  CONSENT_EVENT,
  parseConsentCookie,
  type ConsentChoice,
} from "@/lib/analytics";
import type { CookieConsentContent } from "@/lib/site-config";

/**
 * UK PECR cookie-consent banner. The site sets only essential cookies today; this
 * records the visitor's choice (first-party cookie `np_consent`) and is the gate any
 * future non-essential cookies/analytics must check before loading. Accept OR reject
 * both dismiss it (no pre-ticked consent, no nagging) — required under UK GDPR/PECR.
 */
const ONE_YEAR = 60 * 60 * 24 * 365;

function setConsent(value: ConsentChoice) {
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${CONSENT_COOKIE}=${value}; Max-Age=${ONE_YEAR}; Path=/; SameSite=Lax${secure}`;
  window.dispatchEvent(new CustomEvent<ConsentChoice>(CONSENT_EVENT, { detail: value }));
}

export function CookieConsent({ content }: { content: CookieConsentContent }) {
  // null = not yet determined (SSR / first paint); true/false once we've read the cookie.
  const [needsConsent, setNeedsConsent] = useState<boolean | null>(null);

  useEffect(() => {
    // Reading document.cookie is only possible after mount (not during SSR), so a
    // post-mount setState is the correct pattern here — not derivable render state.
    const chosen = parseConsentCookie(document.cookie) !== null;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNeedsConsent(!chosen);
  }, []);

  if (needsConsent === null) return null;
  if (!needsConsent) return (
    <button
      type="button"
      onClick={() => setNeedsConsent(true)}
      className="fixed bottom-3 left-3 z-50 rounded-full border border-greyblue/30 bg-white px-4 py-2 text-xs font-semibold text-navy shadow-md"
    >{content.settingsLabel}</button>
  );

  function choose(value: ConsentChoice) {
    setConsent(value);
    setNeedsConsent(false);
  }

  return (
    <div
      role="dialog"
      aria-label={content.dialogLabel}
      className="fixed inset-x-0 bottom-0 z-[60] border-t border-greyblue/30 bg-offwhite/95 backdrop-blur"
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="text-sm text-navy/80">
          {content.message} {" "}
          <Link href="/cookie-policy" className="font-semibold text-accent hover:underline">
            {content.policyLabel}
          </Link>
          .
        </p>
        <div className="flex shrink-0 gap-3">
          <button
            type="button"
            onClick={() => choose("rejected")}
            className="rounded-lg border border-greyblue/50 px-5 py-2 text-sm font-semibold text-navy transition-colors hover:bg-greyblue/10"
          >
            {content.rejectLabel}
          </button>
          <button
            type="button"
            onClick={() => choose("accepted")}
            className="rounded-xl bg-accent px-5 py-2 text-sm font-semibold text-white shadow-sm shadow-accent/20 transition-all hover:bg-brand-hover hover:shadow-md"
          >
            {content.acceptLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
