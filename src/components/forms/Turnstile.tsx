"use client";

import Script from "next/script";
import { useEffect, useRef } from "react";

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

declare global {
  interface Window {
    turnstile?: { reset: () => void };
  }
}

/**
 * Cloudflare Turnstile widget for server-action forms. Tokens are single-use, so
 * the widget resets whenever a failed action returns a new state.
 */
export function Turnstile({ resetSignal }: { resetSignal?: unknown }) {
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    window.turnstile?.reset();
  }, [resetSignal]);

  if (!SITE_KEY) return null;
  return (
    <>
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer />
      <div
        className="cf-turnstile"
        data-sitekey={SITE_KEY}
        data-action="npcoaches-form"
        data-theme="light"
      />
    </>
  );
}
