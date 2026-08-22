import { timingSafeEqual } from "node:crypto";

const CAS_FIELDS = {
  otp_codes: new Set(["consumed", "attempts", "code_hash", "expires_at"]),
  contact_submissions: new Set(["email_status", "email_started_at", "email_sent_at"]),
  quote_requests: new Set(["email_status", "email_started_at", "email_sent_at"]),
  bookings: new Set([
    "status", "stripe_session_id", "stripe_payment_intent", "amount", "inventory_status",
    "confirmation_email_status", "confirmation_email_started_at", "confirmation_email_sent_at",
    "staff_email_status", "staff_email_started_at", "staff_email_sent_at",
  ]),
  pass_purchases: new Set([
    "status", "stripe_session_id", "stripe_payment_intent", "amount",
    "confirmation_email_status", "confirmation_email_started_at", "confirmation_email_sent_at",
    "staff_email_status", "staff_email_started_at", "staff_email_sent_at",
  ]),
};

function authorised(req, env) {
  const configured = String(env.INTERNAL_API_SECRET || "");
  const supplied = String(req.get("x-internal-api-secret") || "");
  if (!req.accountability?.user || configured.length < 32 || configured.length !== supplied.length) return false;
  return timingSafeEqual(Buffer.from(configured), Buffer.from(supplied));
}

function validObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function validScalar(value) {
  return value === null
    || typeof value === "boolean"
    || (typeof value === "number" && Number.isFinite(value))
    || (typeof value === "string" && value.length <= 512);
}

function validCasPayload(body) {
  if (!validObject(body) || !Number.isInteger(body.id) || body.id < 1) return false;
  const allowed = CAS_FIELDS[body.collection];
  if (!allowed || !validObject(body.expected) || !validObject(body.changes)) return false;
  const expectedKeys = Object.keys(body.expected);
  const changeKeys = Object.keys(body.changes);
  if (!expectedKeys.length || !changeKeys.length) return false;
  return [...expectedKeys, ...changeKeys].every((field) => allowed.has(field))
    && Object.values(body.expected).every(validScalar)
    && Object.values(body.changes).every(validScalar);
}

function validRun(run) {
  return validObject(run)
    && typeof run.routeSlug === "string" && /^[a-z0-9-]{1,100}$/.test(run.routeSlug)
    && typeof run.serviceCode === "string" && /^[a-z0-9-]{1,100}$/.test(run.serviceCode)
    && typeof run.serviceDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(run.serviceDate)
    && typeof run.departureTime === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(run.departureTime)
    && Number.isInteger(run.capacity) && run.capacity >= 1 && run.capacity <= 500;
}

const runKey = (run) => `${run.serviceCode}:${run.serviceDate}`;

const endpoint = {
  id: "np-internal",
  handler(router, { database, env, logger }) {
    router.use((req, res, next) => {
      if (!authorised(req, env)) return res.status(401).json({ error: "unauthorised" });
      next();
    });

    router.post("/inventory/status", (_req, res) => {
      return res.json({ data: { ready: true } });
    });

    router.post("/cas", async (req, res) => {
      if (!validCasPayload(req.body)) return res.status(400).json({ error: "invalid payload" });
      const { collection, id, expected, changes } = req.body;
      try {
        const affected = await database(collection).where({ id, ...expected }).update(changes);
        return res.json({ data: { updated: affected === 1 } });
      } catch (error) {
        logger.error(error, "NP internal CAS failed");
        return res.status(500).json({ error: "update failed" });
      }
    });

    router.post("/inventory/reserve", async (req, res) => {
      const runs = req.body?.runs;
      const seats = req.body?.seats;
      if (!Array.isArray(runs) || runs.length < 1 || runs.length > 2 || !runs.every(validRun)
        || new Set(runs.map(runKey)).size !== runs.length
        || !Number.isInteger(seats) || seats < 1 || seats > 100) {
        return res.status(400).json({ error: "invalid payload" });
      }

      try {
        const ids = await database.transaction(async (trx) => {
          const keyed = runs.map((run) => ({ ...run, key: runKey(run) }));
          for (const run of keyed) {
            await trx("service_runs").insert({
              run_key: run.key,
              route_slug: run.routeSlug,
              service_code: run.serviceCode,
              service_date: run.serviceDate,
              departure_time: run.departureTime,
              capacity: run.capacity,
              booked_seats: 0,
              status: "scheduled",
            }).onConflict("run_key").ignore();
          }

          const locked = new Map();
          for (const run of [...keyed].sort((a, b) => a.key.localeCompare(b.key))) {
            const row = await trx("service_runs").where({ run_key: run.key }).forUpdate().first();
            if (!row || row.status !== "scheduled" || row.booked_seats + seats > row.capacity) {
              const error = new Error("NO_CAPACITY");
              error.code = "NO_CAPACITY";
              throw error;
            }
            locked.set(run.key, row);
          }

          for (const row of locked.values()) {
            await trx("service_runs").where({ id: row.id }).update({ booked_seats: row.booked_seats + seats });
          }
          return keyed.map((run) => locked.get(run.key).id);
        });
        return res.json({ data: { runIds: ids } });
      } catch (error) {
        if (error?.code === "NO_CAPACITY") return res.status(409).json({ error: "no capacity" });
        logger.error(error, "NP inventory reservation failed");
        return res.status(500).json({ error: "reservation failed" });
      }
    });

    router.post("/inventory/release", async (req, res) => {
      const runIds = req.body?.runIds;
      const seats = req.body?.seats;
      if (!Array.isArray(runIds) || runIds.length < 1 || runIds.length > 2
        || !runIds.every((id) => Number.isInteger(id) && id > 0)
        || new Set(runIds).size !== runIds.length
        || !Number.isInteger(seats) || seats < 1 || seats > 100) {
        return res.status(400).json({ error: "invalid payload" });
      }
      try {
        await database.transaction(async (trx) => {
          for (const id of [...runIds].sort((a, b) => a - b)) {
            const row = await trx("service_runs").where({ id }).forUpdate().first();
            if (!row || row.booked_seats < seats) throw new Error("INVALID_RELEASE");
            await trx("service_runs").where({ id }).update({ booked_seats: row.booked_seats - seats });
          }
        });
        return res.json({ data: { released: true } });
      } catch (error) {
        logger.error(error, "NP inventory release failed");
        return res.status(409).json({ error: "release failed" });
      }
    });
  },
};

export default endpoint;
