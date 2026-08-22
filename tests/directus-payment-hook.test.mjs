import assert from "node:assert/strict";
import test from "node:test";
import paymentEventsHook from "../extensions/directus-extension-np-payment-events/dist/index.js";

const secret = "test-secret-that-is-at-least-32-bytes";

test("payment hook notifies only for CMS-paid bookings and passes", async () => {
  const handlers = new Map();
  const requests = [];
  const errors = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    requests.push({ url, options });
    return { ok: true, status: 200 };
  };

  try {
    paymentEventsHook({ action(name, handler) { handlers.set(name, handler); } }, {
      env: { WEB_INTERNAL_URL: "http://web:3000/", INTERNAL_API_SECRET: secret },
      logger: { error(...args) { errors.push(args); } },
    });

    await handlers.get("items.update")({ collection: "bookings", keys: [12], payload: { status: "pending" } });
    await handlers.get("items.update")({ collection: "bookings", keys: [12], payload: { status: "paid" } });
    await handlers.get("items.create")({ collection: "pass_purchases", key: "13", payload: { status: "paid" } });
    await handlers.get("items.update")({ collection: "pages", keys: [14], payload: { status: "paid" } });
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(errors.length, 0);
  assert.equal(requests.length, 2);
  assert.deepEqual(requests.map((entry) => JSON.parse(entry.options.body)), [
    { collection: "bookings", id: 12 },
    { collection: "pass_purchases", id: 13 },
  ]);
  assert.ok(requests.every((entry) => entry.url === "http://web:3000/api/internal/payment-status"));
  assert.ok(requests.every((entry) => entry.options.headers.Authorization === `Bearer ${secret}`));
});