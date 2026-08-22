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

test("two-leg reservations and releases are transactional", async () => {
  const database = mockDatabase();
  const request = harness(database);
  const runs = [
    { serviceCode: "lm-morning", routeSlug: "outward", serviceDate: "2026-08-30", departureTime: "09:45", capacity: 2 },
    { serviceCode: "ml-afternoon", routeSlug: "return", serviceDate: "2026-08-31", departureTime: "15:00", capacity: 2 },
  ];
  const reserved = await request("/inventory/reserve", { runs, seats: 2 });
  assert.equal(reserved.status, 200);
  assert.deepEqual(database.rows("service_runs").map((row) => row.run_key), ["lm-morning:2026-08-30", "ml-afternoon:2026-08-31"]);
  assert.deepEqual(database.rows("service_runs").map((row) => row.service_code), ["lm-morning", "ml-afternoon"]);
  assert.deepEqual(database.rows("service_runs").map((row) => row.booked_seats), [2, 2]);

  const rejected = await request("/inventory/reserve", { runs, seats: 1 });
  assert.equal(rejected.status, 409);
  assert.deepEqual(database.rows("service_runs").map((row) => row.booked_seats), [2, 2]);

  const released = await request("/inventory/release", { runIds: reserved.body.data.runIds, seats: 2 });
  assert.equal(released.status, 200);
  assert.deepEqual(database.rows("service_runs").map((row) => row.booked_seats), [0, 0]);
});

test("inventory accepts combined capacity above the old single-coach limit", async () => {
  const database = mockDatabase();
  const request = harness(database);
  const result = await request("/inventory/reserve", {
    runs: [{ serviceCode: "lm-morning", routeSlug: "outward", serviceDate: "2026-08-30", departureTime: "09:45", capacity: 240 }],
    seats: 2,
  });
  assert.equal(result.status, 200);
  assert.equal(database.rows("service_runs")[0].capacity, 240);
  assert.equal(database.rows("service_runs")[0].booked_seats, 2);
});

test("inventory rejects capacity above the CMS limit", async () => {
  const request = harness(mockDatabase());
  const result = await request("/inventory/reserve", {
    runs: [{ serviceCode: "lm-morning", routeSlug: "outward", serviceDate: "2026-08-30", departureTime: "09:45", capacity: 501 }],
    seats: 1,
  });
  assert.equal(result.status, 400);
});
