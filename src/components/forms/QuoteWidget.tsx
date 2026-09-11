"use client";

import Script from "next/script";
import { useState } from "react";

const widgetUrl = "https://portal.np-coaches.co.uk/widgets/quickquote";

/** Portal-owned form; no local form action or Directus writes. */
export function QuoteWidget() {
  const [handler, setHandler] = useState<"loading" | "ready" | "failed">("loading");

  return (
    <>
      <p className="mb-4 px-2 text-sm text-navy/80">
        Form not showing?{" "}
        <a href={widgetUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-accent underline underline-offset-4">
          Open the quote form in a new tab
        </a>
      </p>
      <Script
        id="iFrameHandler"
        src="https://portal.np-coaches.co.uk/Scripts/CMO/iframe-handler.js"
        strategy="afterInteractive"
        onReady={() => setHandler("ready")}
        onError={() => setHandler("failed")}
      />
      {/* Install the supplied resize listener before the iframe sends its initial
          height. onReady also runs when returning here through client navigation. */}
      {handler === "loading" ? (
        <p role="status" className="px-2 py-8 text-sm text-navy/70">Loading quote form…</p>
      ) : (
        <iframe
          id="ds-quickquotewidget"
          title="NP Coaches quick quote form"
          src={widgetUrl}
          frameBorder="0"
          width="100%"
          scrolling={handler === "ready" ? "no" : "auto"}
          className="block h-[1000px] w-full border-0"
        />
      )}
    </>
  );
}
