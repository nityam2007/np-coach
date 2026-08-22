import assert from "node:assert/strict";
import test from "node:test";
import { findJourney, resolveJourneyOptions } from "../src/lib/booking-rules.ts";
import type { CoachRoute, ScheduledService } from "../src/lib/site-config.ts";

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

const fare = { from: "southall", to: "wolverhampton", adult: 1800, child: 1800, infant: 1800 };
const scheduled: ScheduledService[] = [
  {
    code: "lm-morning", routeSlug: "london-to-wolverhampton", name: "Morning", label: "Morning",
    salesMode: "online", operatingDays: [1, 2, 3, 4, 5, 6, 7], capacity: 60, notice: "",
    stops: [
      { code: "southall", time: "09:45", boarding: true, dropping: false },
      { code: "coventry", time: "12:00", boarding: true, dropping: true },
      { code: "wolverhampton", time: "14:00", boarding: false, dropping: true },
    ],
    fares: [fare],
  },
  {
    code: "lm-evening", routeSlug: "london-to-wolverhampton", name: "Evening", label: "Evening",
    salesMode: "online", operatingDays: [1, 2, 3, 4, 5, 6, 7], capacity: 60, notice: "",
    stops: [
      { code: "southall", time: "14:45", boarding: true, dropping: false },
      { code: "wolverhampton", time: "18:45", boarding: false, dropping: true },
    ],
    fares: [fare],
  },
  {
    code: "ml-evening", routeSlug: "wolverhampton-to-london", name: "Evening return", label: "Evening",
    salesMode: "online", operatingDays: [1, 2, 3, 4, 5, 6, 7], capacity: 60, notice: "",
    stops: [
      { code: "wolverhampton", time: "19:15", boarding: true, dropping: true },
      { code: "slough", time: "22:15", boarding: true, dropping: true },
      { code: "southall", time: "22:30", boarding: false, dropping: true },
    ],
    fares: [{ from: "wolverhampton", to: "southall", adult: 1800, child: 1800, infant: 1800 }],
  },
  {
    code: "london-leicester-morning", routeSlug: "london-to-leicester", name: "Leicester", label: "Driver",
    salesMode: "driver_only", operatingDays: [1, 5, 6, 7], capacity: 60, notice: "",
    stops: [
      { code: "southall", time: "08:15", boarding: true, dropping: false },
      { code: "slough", time: "08:45", boarding: true, dropping: true },
      { code: "leicester", time: "11:15", boarding: false, dropping: true },
    ],
    fares: [{ from: "southall", to: "slough", adult: 1800, child: 1800, infant: 1800 }],
  },
];

test("returns both explicitly-priced London to Midlands services", () => {
  const options = resolveJourneyOptions(scheduled, "southall", "wolverhampton", "2026-08-24", new Date("2026-08-20T06:00:00Z"));
  assert.deepEqual(options.map((option) => option.service.code), ["lm-morning", "lm-evening"]);
});

test("never leaks an overlapping Leicester fare and excludes driver-only services", () => {
  const options = resolveJourneyOptions(scheduled, "southall", "slough", "2026-08-24", new Date("2026-08-20T06:00:00Z"));
  assert.deepEqual(options, []);
});

test("missing fares and absent stops fail closed", () => {
  assert.deepEqual(resolveJourneyOptions(scheduled, "southall", "coventry", "2026-08-24", new Date("2026-08-20T06:00:00Z")), []);
  assert.deepEqual(resolveJourneyOptions([scheduled[2]], "wolverhampton", "coventry", "2026-08-24", new Date("2026-08-20T06:00:00Z")), []);
});

test("all online services operate on every ISO weekday", () => {
  assert.ok(scheduled.filter((service) => service.salesMode === "online").every((service) => service.operatingDays.join() === "1,2,3,4,5,6,7"));
});
