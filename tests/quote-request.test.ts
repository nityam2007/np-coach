import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { quoteRequestEmailData, quoteRequestRecord } from "../src/lib/quote-request.ts";

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
