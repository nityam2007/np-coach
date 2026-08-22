import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { findJourney, resolveJourneyOptions } from "../src/lib/booking-rules.ts";
import type { CoachRoute, ScheduledService } from "../src/lib/site-config.ts";

const daily: CoachRoute = {
  slug: "london-to-wolverhampton",
  from: "London",
  to: "Wolverhampton",
  days: "7 days a week",
  priceSingle: 1500,
  priceReturn: 2500,
  summary: "",
  seoTitle: "",
  seoDescription: "",
  stops: [
    { code: "southall", time: "9:45 AM", place: "Southall", detail: "" },
    { code: "wolverhampton", time: "1:30 PM", place: "Wolverhampton", detail: "" },
  ],
};

const limited: CoachRoute = {
  ...daily,
  slug: "london-to-leicester",
  days: "Friday to Monday only",
  stops: [
    { code: "southall", time: "8:15 AM", place: "Southall", detail: "" },
    { code: "leicester", time: "11:15 AM", place: "Leicester", detail: "" },
  ],
};

const fallback = JSON.parse(
  readFileSync(new URL("../src/lib/site-content.json", import.meta.url), "utf8"),
) as { scheduledServices: ScheduledService[] };
const services = fallback.scheduledServices;
const now = new Date("2026-08-20T06:00:00Z");
const journeyDate = "2026-08-24";

test("requires a valid route direction", () => {
  assert.ok(findJourney([daily], "southall", "wolverhampton", "2026-08-21", now));
  assert.equal(findJourney([daily], "wolverhampton", "southall", "2026-08-21", now), null);
});

test("enforces Leicester Friday-to-Monday operation", () => {
  assert.equal(findJourney([limited], "southall", "leicester", "2026-08-20", now), null);
  assert.ok(findJourney([limited], "southall", "leicester", "2026-08-21", now));
});

test("enforces the one-hour same-day cutoff", () => {
  assert.equal(findJourney([daily], "southall", "wolverhampton", "2026-08-20", new Date("2026-08-20T08:00:00Z")), null);
  assert.ok(findJourney([daily], "southall", "wolverhampton", "2026-08-20", now));
});

test("sells only the confirmed London evening fare", () => {
  const options = resolveJourneyOptions(services, "southall", "wolverhampton", journeyDate, now);
  assert.equal(options.length, 1);
  assert.equal(options[0].service.code, "lm-evening");
  assert.equal(options[0].departureTime, "14:45");
  assert.equal(options[0].arrivalTime, "18:45");
  assert.equal(options[0].durationMinutes, 240);
  assert.equal(options[0].fare.adult, 1800);
});

test("sells only the six confirmed Midlands evening fare rows", () => {
  const confirmed = [
    ["birmingham-soho", "slough", 1500],
    ["birmingham-soho", "southall", 1500],
    ["birmingham-smethwick", "slough", 1500],
    ["birmingham-smethwick", "southall", 1500],
    ["wolverhampton", "slough", 1800],
    ["wolverhampton", "southall", 1800],
  ] as const;

  for (const [from, to, fare] of confirmed) {
    const options = resolveJourneyOptions(services, from, to, journeyDate, now);
    assert.equal(options.length, 1);
    assert.equal(options[0].service.code, "ml-evening");
    assert.equal(options[0].fare.adult, fare);
  }
});

test("missing fares fail closed even when the stops share a service", () => {
  assert.deepEqual(resolveJourneyOptions(services, "southall", "slough", journeyDate, now), []);
  assert.deepEqual(resolveJourneyOptions(services, "birmingham-soho", "wolverhampton", journeyDate, now), []);
  assert.deepEqual(resolveJourneyOptions(services, "wolverhampton", "coventry", journeyDate, now), []);
});

test("never leaks a fare from a driver-only Leicester service", () => {
  assert.deepEqual(resolveJourneyOptions(services, "southall", "leicester", journeyDate, now), []);
});

test("all online services operate on every ISO weekday", () => {
  assert.ok(services
    .filter((service) => service.salesMode === "online")
    .every((service) => service.operatingDays.join() === "1,2,3,4,5,6,7"));
});
