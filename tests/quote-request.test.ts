import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { quoteRequestEmailData, quoteRequestRecord } from "../src/lib/quote-request.ts";
import { quoteCustomerEmail } from "../src/lib/email-templates.ts";
import type { SiteSettings } from "../src/lib/directus.ts";

const input = {
  name: "Test Customer",
  email: "customer@example.test",
  phone: "020 0000 0000",
  pickup: "Iver",
  destination: "Birmingham",
  outboundDate: "2026-09-15",
  returnDate: "2026-09-16",
  passengers: 30,
  coachSize: "35 seats",
  journeyDetails: "Private coach hire regression test",
};

test("quote form maps every field onto the production Directus schema", () => {
  assert.deepEqual(quoteRequestRecord(input), {
    name: "Test Customer",
    email: "customer@example.test",
    phone: "020 0000 0000",
    trip_from: "Iver",
    trip_to: "Birmingham",
    trip_date: "2026-09-15",
    return_date: "2026-09-16",
    passengers: 30,
    coach_size: "35 seats",
    message: "Private coach hire regression test",
  });
});

test("quote email restores every field from the persisted Directus record", () => {
  assert.deepEqual(quoteRequestEmailData({ id: 1, ...quoteRequestRecord(input) }), input);
});

test("production bootstrap reconciles every canonical quote journey field", () => {
  const seed = readFileSync(new URL("../scripts/seed-directus.mjs", import.meta.url), "utf8");
  for (const field of ["trip_from", "trip_to", "trip_date", "return_date", "coach_size", "message"]) {
    assert.match(seed, new RegExp(`(?:str|text)\\(\\"${field}\\"\\)|field: \\"${field}\\"`));
  }
});

test("legacy incomplete quote rows never render literal undefined in customer email", () => {
  const data = quoteRequestEmailData({
    id: 2,
    name: "Test Customer",
    email: "customer@example.test",
    phone: null,
    trip_from: null,
    trip_to: null,
    trip_date: null,
    return_date: null,
    passengers: 11,
    coach_size: null,
    message: null,
  });
  const settings = {
    name: "NP Coaches",
    legalName: "New Punjab Coaches Ltd",
    tagline: "Premium Coach Transport Across the UK",
    phone: { display: "0208 843 1000", href: "tel:+442088431000" },
    email: { general: "info@np-coaches.co.uk" },
    address: { line1: "Willow Tree Farm", line2: "Love Lane", city: "Iver", postcode: "SL0 9QZ" },
    emailTemplates: {
      quoteCustomer: {
        subject: "Quote received",
        eyebrow: "Quote request received",
        heading: "We are reviewing your journey",
        intro: "Thank you, {{name}}.",
        footer: "We will contact you.",
      },
    },
  } as unknown as SiteSettings;
  const email = quoteCustomerEmail(settings, data);
  assert.doesNotMatch(email.text, /undefined/i);
  assert.match(email.text, /Journey: Not provided/);
  assert.match(email.text, /Outbound: Not provided/);
});
