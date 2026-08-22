import assert from "node:assert/strict";
import test from "node:test";
import { findJourney } from "../src/lib/booking-rules.ts";
import type { CoachRoute } from "../src/lib/site-config.ts";

const daily: CoachRoute = {
  slug: "london-to-wolverhampton", from: "London", to: "Wolverhampton", days: "7 days a week",
  priceSingle: 1500, priceReturn: 2500, summary: "", seoTitle: "", seoDescription: "",
  stops: [
    { code: "southall", time: "9:45 AM", place: "Southall", detail: "" },
    { code: "wolverhampton", time: "1:30 PM", place: "Wolverhampton", detail: "" },
  ],
};
const limited: CoachRoute = { ...daily, slug: "london-to-leicester", days: "Friday to Monday only", stops: [
  { code: "southall", time: "8:15 AM", place: "Southall", detail: "" },
  { code: "leicester", time: "11:15 AM", place: "Leicester", detail: "" },
] };

test("requires a valid route direction", () => {
  const now = new Date("2026-08-20T06:00:00Z");
  assert.ok(findJourney([daily], "southall", "wolverhampton", "2026-08-21", now));
  assert.equal(findJourney([daily], "wolverhampton", "southall", "2026-08-21", now), null);
});

test("enforces Leicester Friday-to-Monday operation", () => {
  const now = new Date("2026-08-20T06:00:00Z");
  assert.equal(findJourney([limited], "southall", "leicester", "2026-08-20", now), null);
  assert.ok(findJourney([limited], "southall", "leicester", "2026-08-21", now));
});

test("enforces the one-hour same-day cutoff", () => {
  assert.equal(findJourney([daily], "southall", "wolverhampton", "2026-08-20", new Date("2026-08-20T08:00:00Z")), null);
  assert.ok(findJourney([daily], "southall", "wolverhampton", "2026-08-20", new Date("2026-08-20T06:00:00Z")));
});
