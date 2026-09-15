import assert from "node:assert/strict";
import test from "node:test";
import {
  analyticsPageLocation,
  applyAnalyticsChoice,
  gtag,
  isGoogleAnalyticsId,
  parseConsentCookie,
} from "../src/lib/analytics.ts";

test("Google tag commands use the Arguments queue format, including consent withdrawal", () => {
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const browser = { dataLayer: [] as IArguments[] };
  Object.defineProperty(globalThis, "window", { value: browser, configurable: true });
  try {
    gtag("consent", "default", { analytics_storage: "denied" });
    gtag("config", "G-3GXSRDBP55", { send_page_view: false });
    gtag("event", "page_view", { page_path: "/" });
    gtag("consent", "update", { analytics_storage: "denied" });
    assert.equal(browser.dataLayer.length, 4);
    for (const command of browser.dataLayer) {
      assert.equal(Array.isArray(command), false);
      assert.equal(Object.prototype.toString.call(command), "[object Arguments]");
    }
    assert.deepEqual(Array.from(browser.dataLayer[1]), ["config", "G-3GXSRDBP55", { send_page_view: false }]);
    assert.deepEqual(Array.from(browser.dataLayer[3]), ["consent", "update", { analytics_storage: "denied" }]);
  } finally {
    if (previousWindow) Object.defineProperty(globalThis, "window", previousWindow);
    else Reflect.deleteProperty(globalThis, "window");
  }
});

test("consent cookies preserve an explicit rejection and never infer acceptance", () => {
  assert.equal(parseConsentCookie("foo=bar; np_consent=accepted"), "accepted");
  assert.equal(parseConsentCookie("np_consent=rejected"), "rejected");
  assert.equal(parseConsentCookie("np_consent=unexpected"), null);
  assert.equal(parseConsentCookie(""), null);
});

test("cookieless startup, acceptance, rejection and re-acceptance apply before tag events", () => {
  const previous = ["window", "document", "location"].map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const);
  const browser: Window & Record<string, unknown> = {} as Window & Record<string, unknown>;
  const cookieWrites: string[] = [];
  const documentMock = {
    referrer: "https://np-coaches.co.uk/booking/success?session_id=private",
    get cookie() { return "np_consent=accepted; _ga=test; _ga_3GXSRDBP55=session; other=keep"; },
    set cookie(value: string) { cookieWrites.push(value); },
  };
  for (const [key, value] of Object.entries({ window: browser, document: documentMock, location: new URL("https://www.np-coaches.co.uk/") })) {
    Object.defineProperty(globalThis, key, { value, configurable: true });
  }
  try {
    const id = "G-3GXSRDBP55";
    // A returning rejected visitor must not initialize or queue the tag.
    assert.equal(applyAnalyticsChoice(id, "/", "rejected"), false);
    assert.equal(browser[`ga-disable-${id}`], true);
    assert.equal(browser.dataLayer, undefined);

    assert.equal(applyAnalyticsChoice(id, "/", null), true);
    const commands = browser.dataLayer!;
    assert.equal(commands[0][0], "consent");
    assert.equal(commands[0][1], "default");
    assert.equal(commands[1][2].analytics_storage, "denied");
    assert.equal(commands[3][0], "config");
    assert.equal(commands[3][2].send_page_view, false);
    assert.equal(commands[3][2].allow_google_signals, false);
    assert.equal(commands[3][2].page_referrer, "https://np-coaches.co.uk/booking/success");
    assert.equal(browser[`ga-disable-${id}`], false);

    applyAnalyticsChoice(id, "/", "accepted");
    assert.equal(commands.at(-1)![2].analytics_storage, "granted");
    assert.equal(commands.at(-1)![2].ad_storage, "denied");
    assert.equal(commands.at(-1)![2].ad_user_data, "denied");
    assert.equal(commands.at(-1)![2].ad_personalization, "denied");

    assert.equal(applyAnalyticsChoice(id, "/", "rejected"), false);
    assert.equal(browser[`ga-disable-${id}`], true);
    assert.equal(commands.at(-1)![2].analytics_storage, "denied");
    assert.ok(cookieWrites.some((cookie) => cookie.startsWith("_ga=;") && cookie.includes("Domain=np-coaches.co.uk")));
    assert.ok(cookieWrites.every((cookie) => cookie.startsWith("_ga=") || cookie.startsWith("_ga_")));
    assert.equal(applyAnalyticsChoice(id, "/contact-us", "rejected"), false);

    assert.equal(applyAnalyticsChoice(id, "/", "accepted"), true);
    assert.equal(browser[`ga-disable-${id}`], false);
    assert.equal(commands.filter((command) => command[0] === "config").length, 1);
  } finally {
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  }
});

test("analytics accepts only GA4 measurement ids", () => {
  assert.equal(isGoogleAnalyticsId("G-3GXSRDBP55"), true);
  assert.equal(isGoogleAnalyticsId("UA-123"), false);
  assert.equal(isGoogleAnalyticsId(undefined), false);
});

test("analytics page locations exclude query strings and fragments", () => {
  assert.equal(
    analyticsPageLocation("https://np-coaches.co.uk", "/booking/success?session_id=private#ticket"),
    "https://np-coaches.co.uk/booking/success",
  );
  assert.equal(
    analyticsPageLocation("https://np-coaches.co.uk", "/account/ticket/NPX-PRIVATE?x=y"),
    "https://np-coaches.co.uk/account/ticket",
  );
});
