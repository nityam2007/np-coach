import assert from "node:assert/strict";
import test from "node:test";
import endpoint from "../extensions/directus-extension-np-internal/dist/index.js";

const secret = "test-secret-that-is-at-least-32-bytes";

function mockDatabase(seed = {}) {
  let tables = Object.fromEntries(Object.entries(seed).map(([name, rows]) => [name, rows.map((row) => ({ ...row }))]));

  function client(table) {
    tables[table] ??= [];
    return {
      insert(data) {
        return {
          onConflict(field) {
            return {
              async ignore() {
                if (!tables[table].some((row) => row[field] === data[field])) {
                  tables[table].push({ id: tables[table].length + 1, ...data });
                }
              },
            };
          },
        };
      },
      where(expected) {
        const matches = () => tables[table].filter((row) =>
          Object.entries(expected).every(([field, value]) => row[field] === value));
        return {
          forUpdate() {
            return { first: async () => matches()[0] ? { ...matches()[0] } : undefined };
          },
          async update(changes) {
            const found = matches();
            for (const row of found) Object.assign(row, changes);
            return found.length;
          },
        };
      },
    };
  }

  client.transaction = async (work) => {
    const snapshot = structuredClone(tables);
    try {
      return await work(client);
    } catch (error) {
      tables = snapshot;
      throw error;
    }
  };
  client.rows = (table) => tables[table];
  return client;
}

function harness(database) {
  let middleware;
  const handlers = new Map();
  endpoint.handler({
    use(fn) { middleware = fn; },
    post(path, fn) { handlers.set(path, fn); },
  }, {
    database,
    env: { INTERNAL_API_SECRET: secret },
    logger: { error() {} },
  });

  return async function request(path, body, suppliedSecret = secret) {
    const req = {
      body,
      accountability: { user: "app-user" },
      get: (name) => name.toLowerCase() === "x-internal-api-secret" ? suppliedSecret : undefined,
    };
    const result = { status: 200, body: undefined };
    const res = {
      status(code) { result.status = code; return res; },
      json(value) { result.body = value; return res; },
    };
    let authorised = false;
    middleware(req, res, () => { authorised = true; });
    if (authorised) await handlers.get(path)(req, res);
    return result;
  };
}

test("internal endpoint rejects a missing shared secret", async () => {
  const request = harness(mockDatabase());
  const result = await request("/cas", {}, "");
  assert.equal(result.status, 401);
});

test("inventory readiness is exposed only through the authenticated endpoint", async () => {
  const request = harness(mockDatabase());
  assert.deepEqual((await request("/inventory/status", {})).body, { data: { ready: true } });
  assert.equal((await request("/inventory/status", {}, "")).status, 401);
});

test("compare-and-swap only updates the expected state once", async () => {
  const database = mockDatabase({ bookings: [{ id: 1, status: "pending", stripe_session_id: null }] });
  const request = harness(database);
  const payload = {
    collection: "bookings",
    id: 1,
    expected: { status: "pending", stripe_session_id: null },
    changes: { stripe_session_id: "cs_test" },
  };
  assert.deepEqual((await request("/cas", payload)).body, { data: { updated: true } });
  assert.deepEqual((await request("/cas", payload)).body, { data: { updated: false } });
});

test("90 percent coupon creates two-leg paid inventory and is idempotent", async () => {
  const database = mockDatabase({
    bookings: [{
      id: 1,
      reference: "NPC-PAID-1",
      status: "pending",
      stripe_session_id: "cs_test_paid_booking",
      stripe_payment_intent: null,
      inventory_status: "unreserved",
      outward_run_id: null,
      return_run_id: null,
      amount: 1500,
    }],
  });
  const request = harness(database);
  const payload = {
    bookingId: 1,
    sessionId: "cs_test_paid_booking",
    paymentIntent: "pi_test_paid_booking",
    amountTotal: 150,
    amountSubtotal: 1500,
    amountDiscount: 1350,
    runs: [
      { serviceCode: "lm-morning", routeSlug: "outward", serviceDate: "2026-08-30", departureTime: "09:45", capacity: 240 },
      { serviceCode: "ml-afternoon", routeSlug: "return", serviceDate: "2026-08-31", departureTime: "15:00", capacity: 60 },
    ],
    seats: 1,
  };

  const committed = await request("/inventory/commit-paid-booking", payload);
  assert.equal(committed.status, 200);
  assert.deepEqual(committed.body, { data: { reference: "NPC-PAID-1", runIds: [1, 2] } });
  assert.deepEqual(database.rows("service_runs").map((row) => row.booked_seats), [1, 1]);
  assert.equal(database.rows("service_runs")[0].capacity, 240);
  assert.deepEqual(database.rows("bookings")[0], {
    id: 1,
    reference: "NPC-PAID-1",
    status: "paid",
    stripe_session_id: "cs_test_paid_booking",
    stripe_payment_intent: "pi_test_paid_booking",
    inventory_status: "committed",
    outward_run_id: 1,
    return_run_id: 2,
    subtotal_amount: 1500,
    discount_amount: 1350,
    amount: 150,
  });

  const retried = await request("/inventory/commit-paid-booking", payload);
  assert.equal(retried.status, 200);
  assert.deepEqual(database.rows("service_runs").map((row) => row.booked_seats), [1, 1]);
});

test("email delivery overview tracks attempts and final state without collection permissions", async () => {
  const database = mockDatabase();
  const request = harness(database);
  const begin = {
    idempotencyKey: "booking:14:customer",
    emailType: "booking_confirmation",
    recipient: "customer@example.test",
    subject: "Your ticket",
    sourceCollection: "bookings",
    sourceId: 14,
    reference: "NPX-TEST",
    messageId: "<booking-test@example.test>",
  };

  assert.deepEqual((await request("/email-log/begin", begin)).body, { data: { id: 1, attempts: 1 } });
  assert.deepEqual((await request("/email-log/finish", {
    idempotencyKey: begin.idempotencyKey,
    delivered: false,
    errorCode: "smtp_not_configured",
  })).body, { data: { updated: true } });
  assert.deepEqual((await request("/email-log/begin", begin)).body, { data: { id: 1, attempts: 2 } });
  assert.deepEqual((await request("/email-log/finish", {
    idempotencyKey: begin.idempotencyKey,
    delivered: true,
    errorCode: null,
  })).body, { data: { updated: true } });

  assert.equal(database.rows("email_logs").length, 1);
  assert.equal(database.rows("email_logs")[0].attempts, 2);
  assert.equal(database.rows("email_logs")[0].status, "sent");
  assert.equal(database.rows("email_logs")[0].error_code, null);
  assert.ok(database.rows("email_logs")[0].sent_at);
});

test("CMS-paid booking reconciliation creates inventory once", async () => {
  const database = mockDatabase({
    bookings: [{
      id: 1,
      reference: "NPC-MANUAL-1",
      status: "paid",
      stripe_session_id: null,
      inventory_status: "unreserved",
      outward_run_id: null,
      return_run_id: null,
    }],
  });
  const request = harness(database);
  const payload = {
    bookingId: 1,
    runs: [{ serviceCode: "lm-morning", routeSlug: "outward", serviceDate: "2026-08-30", departureTime: "09:45", capacity: 60 }],
    seats: 2,
  };

  const reconciled = await request("/inventory/reconcile-paid-booking", payload);
  assert.equal(reconciled.status, 200);
  assert.deepEqual(reconciled.body, { data: { reference: "NPC-MANUAL-1", runIds: [1] } });
  assert.equal(database.rows("service_runs")[0].booked_seats, 2);
  assert.equal(database.rows("bookings")[0].inventory_status, "committed");

  const retried = await request("/inventory/reconcile-paid-booking", payload);
  assert.equal(retried.status, 200);
  assert.equal(database.rows("service_runs")[0].booked_seats, 2);
});
test("failed paid commit rolls back inventory and leaves booking pending", async () => {
  const database = mockDatabase({
    bookings: [{
      id: 1,
      reference: "NPC-PAID-2",
      status: "pending",
      stripe_session_id: "cs_test_no_capacity",
      inventory_status: "unreserved",
      outward_run_id: null,
      return_run_id: null,
    }],
    service_runs: [{
      id: 1,
      run_key: "lm-morning:2026-08-30",
      service_code: "lm-morning",
      status: "scheduled",
      capacity: 1,
      booked_seats: 1,
    }],
  });
  const request = harness(database);
  const result = await request("/inventory/commit-paid-booking", {
    bookingId: 1,
    sessionId: "cs_test_no_capacity",
    paymentIntent: "pi_test_no_capacity",
    amountTotal: 1500,
    amountSubtotal: 1500,
    amountDiscount: 0,
    runs: [
      { serviceCode: "lm-morning", routeSlug: "outward", serviceDate: "2026-08-30", departureTime: "09:45", capacity: 240 },
      { serviceCode: "ml-afternoon", routeSlug: "return", serviceDate: "2026-08-31", departureTime: "15:00", capacity: 60 },
    ],
    seats: 1,
  });

  assert.equal(result.status, 409);
  assert.equal(database.rows("service_runs")[0].booked_seats, 1);
  assert.equal(database.rows("bookings")[0].status, "pending");
  assert.equal(database.rows("bookings")[0].inventory_status, "unreserved");
});

test("paid inventory rejects capacity above the CMS limit", async () => {
  const database = mockDatabase({
    bookings: [{
      id: 1,
      reference: "NPC-PAID-3",
      status: "pending",
      stripe_session_id: "cs_test_invalid_capacity",
      inventory_status: "unreserved",
      outward_run_id: null,
      return_run_id: null,
    }],
  });
  const request = harness(database);
  const result = await request("/inventory/commit-paid-booking", {
    bookingId: 1,
    sessionId: "cs_test_invalid_capacity",
    paymentIntent: "pi_test_invalid_capacity",
    amountTotal: 1500,
    amountSubtotal: 1500,
    amountDiscount: 0,
    runs: [{ serviceCode: "lm-morning", routeSlug: "outward", serviceDate: "2026-08-30", departureTime: "09:45", capacity: 501 }],
    seats: 1,
  });
  assert.equal(result.status, 400);
  assert.deepEqual(database.rows("service_runs") ?? [], []);
  assert.equal(database.rows("bookings")[0].status, "pending");
});

test("100 percent coupon commits a paid ticket without a payment intent", async () => {
  const database = mockDatabase({
    bookings: [{
      id: 1,
      reference: "NPC-FREE-1",
      status: "pending",
      stripe_session_id: "cs_test_free_booking",
      stripe_payment_intent: null,
      inventory_status: "unreserved",
      outward_run_id: null,
      return_run_id: null,
      subtotal_amount: 1800,
      discount_amount: 0,
      amount: 1800,
    }],
  });
  const request = harness(database);
  const result = await request("/inventory/commit-paid-booking", {
    bookingId: 1,
    sessionId: "cs_test_free_booking",
    paymentIntent: null,
    amountTotal: 0,
    amountSubtotal: 1800,
    amountDiscount: 1800,
    runs: [{ serviceCode: "lm-morning", routeSlug: "outward", serviceDate: "2026-08-30", departureTime: "09:45", capacity: 60 }],
    seats: 1,
  });

  assert.equal(result.status, 200);
  assert.equal(database.rows("bookings")[0].status, "paid");
  assert.equal(database.rows("bookings")[0].inventory_status, "committed");
  assert.equal(database.rows("bookings")[0].stripe_payment_intent, null);
  assert.equal(database.rows("bookings")[0].subtotal_amount, 1800);
  assert.equal(database.rows("bookings")[0].discount_amount, 1800);
  assert.equal(database.rows("bookings")[0].amount, 0);
  assert.equal(database.rows("service_runs")[0].booked_seats, 1);
});

test("95 percent coupon records Stripe subtotal, discount and paid total", async () => {
  const database = mockDatabase({
    bookings: [{
      id: 1,
      reference: "NPC-95-1",
      status: "pending",
      stripe_session_id: "cs_test_95_booking",
      stripe_payment_intent: null,
      inventory_status: "unreserved",
      outward_run_id: null,
      return_run_id: null,
      subtotal_amount: 1800,
      discount_amount: 0,
      amount: 1800,
    }],
  });
  const request = harness(database);
  const result = await request("/inventory/commit-paid-booking", {
    bookingId: 1,
    sessionId: "cs_test_95_booking",
    paymentIntent: "pi_test_95_booking",
    amountTotal: 90,
    amountSubtotal: 1800,
    amountDiscount: 1710,
    runs: [{ serviceCode: "lm-morning", routeSlug: "outward", serviceDate: "2026-08-30", departureTime: "09:45", capacity: 60 }],
    seats: 1,
  });

  assert.equal(result.status, 200);
  assert.equal(database.rows("bookings")[0].subtotal_amount, 1800);
  assert.equal(database.rows("bookings")[0].discount_amount, 1710);
  assert.equal(database.rows("bookings")[0].amount, 90);
});
