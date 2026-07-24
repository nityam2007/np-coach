"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/**
 * UK PECR cookie-consent banner. The site sets only essential cookies today; this
 * records the visitor's choice (first-party cookie `np_consent`) and is the gate any
 * future non-essential cookies/analytics must check before loading. Accept OR reject
 * both dismiss it (no pre-ticked consent, no nagging) — required under UK GDPR/PECR.
 */
const COOKIE = "np_consent";
const ONE_YEAR = 60 * 60 * 24 * 365;

function setConsent(value: "accepted" | "rejected") {
  document.cookie = `${COOKIE}=${value}; Max-Age=${ONE_YEAR}; Path=/; SameSite=Lax`;
}

export function CookieConsent() {
  // null = not yet determined (SSR / first paint); true/false once we've read the cookie.
  const [needsConsent, setNeedsConsent] = useState<boolean | null>(null);

  useEffect(() => {
    // Reading document.cookie is only possible after mount (not during SSR), so a
    // post-mount setState is the correct pattern here — not derivable render state.
    const chosen = document.cookie.split("; ").some((c) => c.startsWith(`${COOKIE}=`));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNeedsConsent(!chosen);
  }, []);

  if (!needsConsent) return null;

  function choose(value: "accepted" | "rejected") {
    setConsent(value);
    setNeedsConsent(false);
  }

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="fixed inset-x-0 bottom-0 z-[60] border-t border-greyblue/30 bg-offwhite/95 backdrop-blur"
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="text-sm text-navy/80">
          We use essential cookies to make this site work. With your consent we&apos;d also use analytics cookies to
          improve it. See our{" "}
          <Link href="/cookie-policy" className="font-semibold text-accent hover:underline">
            Cookie Policy
          </Link>
          .
        </p>
        <div className="flex shrink-0 gap-3">
          <button
            type="button"
            onClick={() => choose("rejected")}
            className="rounded-lg border border-greyblue/50 px-5 py-2 text-sm font-semibold text-navy transition-colors hover:bg-greyblue/10"
          >
            Reject non-essential
          </button>
          <button
            type="button"
            onClick={() => choose("accepted")}
            className="rounded-xl bg-accent px-5 py-2 text-sm font-semibold text-white shadow-sm shadow-accent/20 transition-all hover:bg-brand-hover hover:shadow-md"
          >
            Accept all
          </button>
        </div>
      </div>
    </div>
  );
}
