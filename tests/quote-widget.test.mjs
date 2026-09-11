import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("quote page mounts the portal widget instead of the local form", async () => {
  const page = await readFile(new URL("../src/app/get-a-quote/page.tsx", import.meta.url), "utf8");
  assert.match(page, /<QuoteWidget\s*\/>/);
  assert.doesNotMatch(page, /QuoteForm|submitQuote/);
});

test("widget keeps the provider IDs, resize script and accessible direct fallback", async () => {
  const widget = await readFile(new URL("../src/components/forms/QuoteWidget.tsx", import.meta.url), "utf8");
  assert.match(widget, /https:\/\/portal\.np-coaches\.co\.uk\/widgets\/quickquote/);
  assert.match(widget, /https:\/\/portal\.np-coaches\.co\.uk\/Scripts\/CMO\/iframe-handler\.js/);
  assert.match(widget, /id="ds-quickquotewidget"/);
  assert.match(widget, /id="iFrameHandler"/);
  assert.match(widget, /title="NP Coaches quick quote form"/);
  assert.match(widget, /href=\{widgetUrl\}/);
  assert.match(widget, /onReady=\{/);
  assert.match(widget, /onError=\{/);
  assert.doesNotMatch(widget, /submitQuote|from ["'].*directus|<Turnstile/);
});

test("CSP allows the portal frame and handler without disabling framing protection", async () => {
  const { default: config } = await import("../next.config.ts");
  const entries = await config.headers();
  const csp = entries[0].headers.find(({ key }) => key === "Content-Security-Policy").value;
  const directives = csp.split("; ");
  for (const type of ["frame-src", "script-src"]) {
    assert.ok(directives.find((value) => value.startsWith(`${type} `)).split(" ").includes("https://portal.np-coaches.co.uk"));
  }
  assert.ok(directives.includes("frame-ancestors 'none'"));
  assert.ok(directives.includes("default-src 'self'"));
});
