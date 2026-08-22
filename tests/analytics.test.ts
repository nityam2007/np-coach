import assert from "node:assert/strict";
import test from "node:test";
import {
  analyticsPageLocation,
  isGoogleAnalyticsId,
  parseConsentCookie,
} from "../src/lib/analytics.ts";

test("analytics requires an explicit accepted consent cookie", () => {
  assert.equal(parseConsentCookie("foo=bar; np_consent=accepted"), "accepted");
  assert.equal(parseConsentCookie("np_consent=rejected"), "rejected");
  assert.equal(parseConsentCookie("np_consent=unexpected"), null);
  assert.equal(parseConsentCookie(""), null);
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
});
