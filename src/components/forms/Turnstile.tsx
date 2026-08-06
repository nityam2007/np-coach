"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef } from "react";

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: { sitekey: string; action: string; theme: "light" },
      ) => string;
      remove: (widgetId: string) => void;
      reset: (widgetId: string) => void;
    };
  }
}

/**
 * Cloudflare Turnstile widget for server-action forms. Tokens are single-use, so
 * the widget resets whenever a failed action returns a new state.
 */
export function Turnstile({ resetSignal }: { resetSignal?: unknown }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const mounted = useRef(false);

  const renderWidget = useCallback(() => {
    if (!SITE_KEY || !containerRef.current || !window.turnstile || widgetIdRef.current) return;

    try {
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: SITE_KEY,
        action: "npcoaches-form",
        theme: "light",
      });
    } catch {
      widgetIdRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }

    const widgetId = widgetIdRef.current;
    if (!widgetId) return;

    try {
      window.turnstile?.reset(widgetId);
    } catch {
      widgetIdRef.current = null;
      containerRef.current?.replaceChildren();
      queueMicrotask(renderWidget);
    }
  }, [resetSignal, renderWidget]);

  useEffect(
    () => () => {
      const widgetId = widgetIdRef.current;
      widgetIdRef.current = null;
      if (!widgetId) return;

      try {
        window.turnstile?.remove(widgetId);
      } catch {
        // Navigation may already have removed the third-party iframe.
      }
    },
    [],
  );

  if (!SITE_KEY) return null;
  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onReady={renderWidget}
      />
      <div ref={containerRef} />
    </>
  );
}
