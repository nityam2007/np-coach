import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { findJourney, findJourneyByCode, resolveJourneyOptions } from "../src/lib/booking-rules.ts";
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
const byCode = new Map(services.map((service) => [service.code, service]));
const now = new Date("2026-08-20T06:00:00Z");
const journeyDate = "2026-08-24";

function expectedPairs(
  service: ScheduledService,
  include: (fromIndex: number, toIndex: number) => boolean,
  price: (fromIndex: number, toIndex: number) => number,
) {
  return service.stops.flatMap((from, fromIndex) =>
    service.stops.slice(fromIndex + 1).flatMap((to, offset) => {
      const toIndex = fromIndex + offset + 1;
      return include(fromIndex, toIndex) ? [[from.code, to.code, price(fromIndex, toIndex)]] : [];
    }),
  ).sort();
}

function actualPairs(service: ScheduledService) {
  return service.fares.map((fare) => [fare.from, fare.to, fare.adult]).sort();
}

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

test("mirrors all four WordPress bus timetables at 60 seats", () => {
  const expectedStops = {
    "lm-morning": [
      ["southall", "09:45"], ["slough", "10:15"], ["coventry", "12:00"],
      ["birmingham-soho", "13:00"], ["birmingham-smethwick", "13:30"], ["wolverhampton", "14:00"],
    ],
    "lm-evening": [
      ["southall", "14:45"], ["slough", "15:15"], ["coventry", "17:00"],
      ["birmingham-soho", "18:00"], ["birmingham-smethwick", "18:15"], ["wolverhampton", "18:45"],
    ],
    "ml-afternoon": [
      ["wolverhampton", "14:30"], ["birmingham-smethwick", "15:00"], ["birmingham-soho", "15:15"],
      ["coventry", "16:00"], ["slough", "17:45"], ["southall", "18:15"],
    ],
    "ml-evening": [
      ["birmingham-soho", "18:00"], ["birmingham-smethwick", "18:15"], ["wolverhampton", "19:15"],
      ["slough", "22:15"], ["southall", "22:30"],
    ],
  };

  for (const [code, stops] of Object.entries(expectedStops)) {
    const service = byCode.get(code);
    assert.ok(service);
    assert.equal(service.capacity, 60);
    assert.deepEqual(service.operatingDays, [1, 2, 3, 4, 5, 6, 7]);
    assert.deepEqual(service.stops.map((stop) => [stop.code, stop.time]), stops);
  }
});

test("mirrors every numeric WordPress fare and no blank placeholder row", () => {
  const morning = byCode.get("lm-morning");
  const londonEvening = byCode.get("lm-evening");
  const afternoon = byCode.get("ml-afternoon");
  const midlandsEvening = byCode.get("ml-evening");
  assert.ok(morning && londonEvening && afternoon && midlandsEvening);

  assert.deepEqual(
    actualPairs(morning),
    expectedPairs(morning, () => true, (from, to) => to === 5 && from < 2 ? 1800 : 1500),
  );
  assert.deepEqual(
    actualPairs(londonEvening),
    expectedPairs(londonEvening, (from) => from <= 2, (from, to) => to === 5 && from < 2 ? 1800 : 1500),
  );
  assert.deepEqual(
    actualPairs(afternoon),
    expectedPairs(afternoon, () => true, (from, to) => from === 0 && to >= 4 ? 1800 : 1500),
  );
  assert.deepEqual(
    actualPairs(midlandsEvening),
    expectedPairs(midlandsEvening, (from, to) => from <= 2 && to >= 3, (from) => from === 2 ? 1800 : 1500),
  );

  assert.deepEqual(
    [morning.fares.length, londonEvening.fares.length, afternoon.fares.length, midlandsEvening.fares.length],
    [15, 12, 15, 6],
  );
  assert.ok([morning, londonEvening, afternoon, midlandsEvening]
    .flatMap((service) => service.fares)
    .every((fare) => fare.adult === fare.child && fare.child === fare.infant));
});

test("returns both London to Midlands buses when both have a numeric fare", () => {
  const options = resolveJourneyOptions(services, "southall", "wolverhampton", journeyDate, now);
  assert.deepEqual(options.map((option) => option.service.code), ["lm-morning", "lm-evening"]);
  assert.deepEqual(options.map((option) => option.fare.adult), [1800, 1800]);
  assert.deepEqual(options.map((option) => option.durationMinutes), [255, 240]);
});

test("returns both Midlands to London buses when both have a numeric fare", () => {
  const options = resolveJourneyOptions(services, "wolverhampton", "southall", journeyDate, now);
  assert.deepEqual(options.map((option) => option.service.code), ["ml-afternoon", "ml-evening"]);
  assert.deepEqual(options.map((option) => option.fare.adult), [1800, 1800]);
});

test("blank WordPress placeholder rows remain unavailable on that service", () => {
  assert.equal(findJourneyByCode(services, "lm-evening", "birmingham-soho", "wolverhampton", journeyDate, now), null);
  assert.equal(findJourneyByCode(services, "lm-evening", "birmingham-smethwick", "wolverhampton", journeyDate, now), null);
  assert.equal(findJourneyByCode(services, "ml-evening", "slough", "southall", journeyDate, now), null);
});

test("never exposes a driver-only Leicester service online", () => {
  assert.deepEqual(resolveJourneyOptions(services, "southall", "leicester", journeyDate, now), []);
});
