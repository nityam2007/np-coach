import { timingSafeEqual } from "node:crypto";

const CAS_FIELDS = {
  otp_codes: new Set(["consumed", "attempts", "code_hash", "expires_at"]),
  contact_submissions: new Set(["email_status", "email_started_at", "email_sent_at"]),
  quote_requests: new Set(["email_status", "email_started_at", "email_sent_at"]),
  bookings: new Set([
    "status", "stripe_session_id", "stripe_payment_intent", "subtotal_amount", "discount_amount", "amount", "inventory_status",
    "confirmation_email_status", "confirmation_email_started_at", "confirmation_email_sent_at",
    "staff_email_status", "staff_email_started_at", "staff_email_sent_at",
  ]),
  pass_purchases: new Set([
    "status", "stripe_session_id", "stripe_payment_intent", "subtotal_amount", "discount_amount", "amount",
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

function validInventoryRequest(runs, seats) {
  return Array.isArray(runs) && runs.length >= 1 && runs.length <= 2 && runs.every(validRun)
    && new Set(runs.map(runKey)).size === runs.length
    && Number.isInteger(seats) && seats >= 1 && seats <= 100;
}

function validPaidCommit(body) {
  return validObject(body)
    && Number.isInteger(body.bookingId) && body.bookingId >= 1
    && typeof body.sessionId === "string" && /^cs_[A-Za-z0-9_]{3,252}$/.test(body.sessionId)
    && (body.paymentIntent === null
      || (typeof body.paymentIntent === "string" && /^pi_[A-Za-z0-9_]{3,252}$/.test(body.paymentIntent)))
    && (body.amountTotal === null
      || (Number.isInteger(body.amountTotal) && body.amountTotal >= 0 && body.amountTotal <= 10_000_000))
    && (body.amountSubtotal === null
      || (Number.isInteger(body.amountSubtotal) && body.amountSubtotal >= 0 && body.amountSubtotal <= 10_000_000))
    && (body.amountDiscount === null
      || (Number.isInteger(body.amountDiscount) && body.amountDiscount >= 0 && body.amountDiscount <= 10_000_000))
    && validInventoryRequest(body.runs, body.seats);
}

function validPaidReconciliation(body) {
  return validObject(body)
    && Number.isInteger(body.bookingId) && body.bookingId >= 1
    && validInventoryRequest(body.runs, body.seats);
}

function validShortText(value, max = 255) {
  return value === null || (typeof value === "string" && value.length >= 1 && value.length <= max);
}

function validEmailLogBegin(body) {
  return validObject(body)
    && validShortText(body.idempotencyKey, 200) && body.idempotencyKey !== null
    && validShortText(body.emailType, 100)
    && validShortText(body.recipient)
    && validShortText(body.subject)
    && validShortText(body.sourceCollection, 100)
    && (body.sourceId === null || (Number.isInteger(body.sourceId) && body.sourceId >= 1))
    && validShortText(body.reference, 100)
    && validShortText(body.messageId);
}

function validEmailLogFinish(body) {
  return validObject(body)
    && validShortText(body.idempotencyKey, 200) && body.idempotencyKey !== null
    && typeof body.delivered === "boolean"
    && validShortText(body.errorCode, 100);
}

const EMAIL_DELIVERY_FIELDS = {
  bookings: new Set(["confirmation_email_status", "staff_email_status"]),
  pass_purchases: new Set(["confirmation_email_status", "staff_email_status"]),
  contact_submissions: new Set(["confirmation_email_status", "staff_email_status"]),
  quote_requests: new Set(["confirmation_email_status", "staff_email_status"]),
};

const PAYMENT_COLLECTIONS = new Set(["bookings", "pass_purchases"]);
const LEAD_COLLECTIONS = new Set(["contact_submissions", "quote_requests"]);

const CONTACT_FIELDS = ["name", "email", "phone", "subject", "message"];
const QUOTE_FIELDS = [
  "name", "email", "phone", "pickup", "destination", "outbound_date",
  "return_date", "passengers", "coach_size", "journey_details",
];

function boundedString(value, max, allowEmpty = false) {
  return typeof value === "string" && value.length <= max && (allowEmpty || value.trim().length > 0);
}

function exactFields(value, fields) {
  return validObject(value)
    && Object.keys(value).length === fields.length
    && Object.keys(value).every((field) => fields.includes(field));
}

function validLeadCreate(body) {
  if (!validObject(body) || !LEAD_COLLECTIONS.has(body.collection)) return false;
  const data = body.data;
  if (body.collection === "contact_submissions") {
    return exactFields(data, CONTACT_FIELDS)
      && boundedString(data.name, 120)
      && boundedString(data.email, 200)
      && boundedString(data.phone, 40, true)
      && boundedString(data.subject, 160, true)
      && boundedString(data.message, 4000);
  }
  return exactFields(data, QUOTE_FIELDS)
    && boundedString(data.name, 120)
    && boundedString(data.email, 200)
    && boundedString(data.phone, 40)
    && boundedString(data.pickup, 200)
    && boundedString(data.destination, 200)
    && typeof data.outbound_date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(data.outbound_date)
    && (data.return_date === null || (typeof data.return_date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(data.return_date)))
    && Number.isInteger(data.passengers) && data.passengers >= 1 && data.passengers <= 200
    && boundedString(data.coach_size, 80, true)
    && boundedString(data.journey_details, 4000);
}

function leadPayload(collection, row) {
  const fields = collection === "contact_submissions" ? CONTACT_FIELDS : QUOTE_FIELDS;
  return Object.fromEntries(["id", ...fields].map((field) => [field, row[field]]));
}

function validDeliveryClaim(body) {
  return validObject(body)
    && EMAIL_DELIVERY_FIELDS[body.collection]?.has(body.statusField)
    && Number.isInteger(body.id) && body.id >= 1
    && typeof body.lease === "string" && Number.isFinite(Date.parse(body.lease))
    && typeof body.staleBefore === "string" && Number.isFinite(Date.parse(body.staleBefore));
}

function validDeliveryFinish(body) {
  return validObject(body)
    && EMAIL_DELIVERY_FIELDS[body.collection]?.has(body.statusField)
    && Number.isInteger(body.id) && body.id >= 1
    && typeof body.lease === "string" && Number.isFinite(Date.parse(body.lease))
    && typeof body.delivered === "boolean";
}

function deliveryTimestampFields(statusField) {
  const prefix = statusField.replace(/_status$/, "");
  return { startedField: `${prefix}_started_at`, sentField: `${prefix}_sent_at` };
}

function leadSummaryChanges(row, statusField, delivered) {
  const otherStatusField = statusField === "confirmation_email_status"
    ? "staff_email_status"
    : "confirmation_email_status";
  const status = !delivered || row[otherStatusField] === "failed"
    ? "failed"
    : row[otherStatusField] === "sent" ? "sent" : "sending";
  return {
    email_status: status,
    email_started_at: status === "sending" ? row.email_started_at : null,
    email_sent_at: status === "sent" ? new Date() : null,
  };
}

async function reserveRuns(trx, runs, seats) {
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
}

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

    router.post("/email-log/begin", async (req, res) => {
      if (!validEmailLogBegin(req.body)) return res.status(400).json({ error: "invalid payload" });
      const body = req.body;
      try {
        const data = await database.transaction(async (trx) => {
          let row = await trx("email_logs").where({ idempotency_key: body.idempotencyKey }).forUpdate().first();
          if (!row) {
            await trx("email_logs").insert({
              idempotency_key: body.idempotencyKey,
              email_type: body.emailType,
              recipient: body.recipient,
              subject: body.subject,
              status: "queued",
              attempts: 0,
              source_collection: body.sourceCollection,
              source_id: body.sourceId,
              reference: body.reference,
              message_id: body.messageId,
              error_code: null,
              last_attempt_at: null,
              sent_at: null,
            }).onConflict("idempotency_key").ignore();
            row = await trx("email_logs").where({ idempotency_key: body.idempotencyKey }).forUpdate().first();
          }
          if (!row) throw new Error("EMAIL_LOG_CREATE_FAILED");
          const attempts = Number.isInteger(row.attempts) ? row.attempts + 1 : 1;
          await trx("email_logs").where({ id: row.id }).update({
            status: "sending",
            attempts,
            recipient: body.recipient,
            subject: body.subject,
            message_id: body.messageId,
            error_code: null,
            // Pass native Date values to Knex. MariaDB timestamp columns do not
            // reliably accept ISO strings containing `T`, milliseconds and `Z`.
            last_attempt_at: new Date(),
          });
          return { id: row.id, attempts };
        });
        return res.json({ data });
      } catch (error) {
        logger.error(error, "email log begin failed");
        return res.status(503).json({ error: "email log unavailable" });
      }
    });

    router.post("/email-log/finish", async (req, res) => {
      if (!validEmailLogFinish(req.body)) return res.status(400).json({ error: "invalid payload" });
      try {
        const updated = await database("email_logs").where({ idempotency_key: req.body.idempotencyKey }).update({
          status: req.body.delivered ? "sent" : "failed",
          error_code: req.body.delivered ? null : req.body.errorCode,
          sent_at: req.body.delivered ? new Date() : null,
        });
        return res.json({ data: { updated: updated === 1 } });
      } catch (error) {
        logger.error(error, "email log finish failed");
        return res.status(503).json({ error: "email log unavailable" });
      }
    });

    router.post("/leads/create", async (req, res) => {
      if (!validLeadCreate(req.body)) return res.status(400).json({ error: "invalid payload" });
      const { collection, data } = req.body;
      try {
        const inserted = await database(collection).insert({
          ...data,
          email_status: null,
          email_started_at: null,
          email_sent_at: null,
          confirmation_email_status: "pending",
          confirmation_email_started_at: null,
          confirmation_email_sent_at: null,
          staff_email_status: "pending",
          staff_email_started_at: null,
          staff_email_sent_at: null,
          created_at: new Date(),
        });
        const id = Number(Array.isArray(inserted) ? inserted[0] : inserted);
        if (!Number.isSafeInteger(id) || id < 1) throw new Error("LEAD_CREATE_FAILED");
        return res.json({ data: { id } });
      } catch (error) {
        logger.error(error, "lead create failed");
        return res.status(503).json({ error: "lead storage unavailable" });
      }
    });

    router.post("/lead-delivery/pending", async (req, res) => {
      const limit = req.body?.limit;
      if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
        return res.status(400).json({ error: "invalid payload" });
      }
      try {
        const data = {};
        for (const collection of LEAD_COLLECTIONS) {
          const rows = await database(collection)
            .select("id")
            .where(function unsentLead() {
              this.whereNot("confirmation_email_status", "sent")
                .orWhereNull("confirmation_email_status")
                .orWhereNot("staff_email_status", "sent")
                .orWhereNull("staff_email_status");
            })
            .orderBy("id", "asc")
            .limit(limit);
          data[collection] = rows.map((row) => row.id);
        }
        return res.json({ data });
      } catch (error) {
        logger.error(error, "pending lead email lookup failed");
        return res.status(503).json({ error: "lead delivery unavailable" });
      }
    });

    router.post("/email-delivery/claim", async (req, res) => {
      if (!validDeliveryClaim(req.body)) return res.status(400).json({ error: "invalid payload" });
      const { collection, id, statusField, lease, staleBefore } = req.body;
      const { startedField } = deliveryTimestampFields(statusField);
      try {
        const data = await database.transaction(async (trx) => {
          const row = await trx(collection).where({ id }).forUpdate().first();
          if (!row || (PAYMENT_COLLECTIONS.has(collection) && row.status !== "paid")) {
            return { claimed: false, completed: false };
          }
          if (row[statusField] === "sent") return { claimed: false, completed: true };
          const startedAt = Date.parse(String(row[startedField] ?? ""));
          const staleSending = row[statusField] === "sending"
            && (!Number.isFinite(startedAt) || startedAt < Date.parse(staleBefore));
          const eligible = row[statusField] === null || row[statusField] === "pending"
            || row[statusField] === "failed" || staleSending;
          if (!eligible) return { claimed: false, completed: false };
          const updated = await trx(collection).where({ id }).update({
            [statusField]: "sending",
            [startedField]: new Date(lease),
            ...(LEAD_COLLECTIONS.has(collection)
              ? { email_status: "sending", email_started_at: new Date(lease) }
              : {}),
          });
          return {
            claimed: updated === 1,
            completed: false,
            ...(updated === 1 && LEAD_COLLECTIONS.has(collection)
              ? { lead: leadPayload(collection, row) }
              : {}),
          };
        });
        return res.json({ data });
      } catch (error) {
        logger.error(error, "payment email claim failed");
        return res.status(503).json({ error: "email delivery unavailable" });
      }
    });

    router.post("/email-delivery/finish", async (req, res) => {
      if (!validDeliveryFinish(req.body)) return res.status(400).json({ error: "invalid payload" });
      const { collection, id, statusField, lease, delivered } = req.body;
      const { startedField, sentField } = deliveryTimestampFields(statusField);
      try {
        const updated = await database.transaction(async (trx) => {
          const row = await trx(collection).where({ id }).forUpdate().first();
          const storedLease = Date.parse(String(row?.[startedField] ?? ""));
          // MariaDB timestamp columns may normalize away milliseconds. A one-second
          // window preserves ownership while still rejecting a stale worker after
          // the ten-minute lease timeout and re-claim.
          if (!row || row[statusField] !== "sending" || !Number.isFinite(storedLease)
            || Math.abs(storedLease - Date.parse(lease)) >= 1_000) {
            return false;
          }
          const affected = await trx(collection).where({ id }).update({
            [statusField]: delivered ? "sent" : "failed",
            [sentField]: delivered ? new Date() : null,
            [startedField]: null,
            ...(LEAD_COLLECTIONS.has(collection)
              ? leadSummaryChanges(row, statusField, delivered)
              : {}),
          });
          return affected === 1;
        });
        return res.json({ data: { updated } });
      } catch (error) {
        logger.error(error, "payment email finish failed");
        return res.status(503).json({ error: "email delivery unavailable" });
      }
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

    router.post("/inventory/reconcile-paid-booking", async (req, res) => {
      if (!validPaidReconciliation(req.body)) return res.status(400).json({ error: "invalid payload" });
      const { bookingId, runs, seats } = req.body;
      try {
        const result = await database.transaction(async (trx) => {
          const booking = await trx("bookings").where({ id: bookingId }).forUpdate().first();
          if (!booking || booking.status !== "paid") {
            const error = new Error("BOOKING_CONFLICT");
            error.code = "BOOKING_CONFLICT";
            throw error;
          }
          if (booking.inventory_status === "committed") {
            return {
              reference: booking.reference,
              runIds: [booking.outward_run_id, booking.return_run_id].filter(Number.isInteger),
            };
          }
          if ((booking.inventory_status !== null && booking.inventory_status !== "unreserved")
            || booking.outward_run_id !== null || booking.return_run_id !== null) {
            const error = new Error("BOOKING_CONFLICT");
            error.code = "BOOKING_CONFLICT";
            throw error;
          }

          const runIds = await reserveRuns(trx, runs, seats);
          const affected = await trx("bookings").where({ id: bookingId, status: "paid" }).update({
            inventory_status: "committed",
            outward_run_id: runIds[0],
            return_run_id: runIds[1] ?? null,
          });
          if (affected !== 1) {
            const error = new Error("BOOKING_CONFLICT");
            error.code = "BOOKING_CONFLICT";
            throw error;
          }
          return { reference: booking.reference, runIds };
        });
        return res.json({ data: result });
      } catch (error) {
        if (error?.code === "NO_CAPACITY") return res.status(409).json({ error: "no capacity" });
        if (error?.code === "BOOKING_CONFLICT") return res.status(422).json({ error: "booking state conflict" });
        logger.error(error, "NP manual paid booking inventory reconciliation failed");
        return res.status(500).json({ error: "paid booking reconciliation failed" });
      }
    });

    router.post("/inventory/commit-paid-booking", async (req, res) => {
      if (!validPaidCommit(req.body)) return res.status(400).json({ error: "invalid payload" });
      const { bookingId, sessionId, paymentIntent, amountTotal, amountSubtotal, amountDiscount, runs, seats } = req.body;
      try {
        const result = await database.transaction(async (trx) => {
          const booking = await trx("bookings").where({ id: bookingId }).forUpdate().first();
          if (!booking || booking.stripe_session_id !== sessionId) {
            const error = new Error("BOOKING_CONFLICT");
            error.code = "BOOKING_CONFLICT";
            throw error;
          }
          if (booking.status === "paid" && booking.inventory_status === "committed") {
            return {
              reference: booking.reference,
              runIds: [booking.outward_run_id, booking.return_run_id].filter(Number.isInteger),
            };
          }
          if (booking.status !== "pending"
            || (booking.inventory_status !== null && booking.inventory_status !== "unreserved")
            || booking.outward_run_id !== null || booking.return_run_id !== null) {
            const error = new Error("BOOKING_CONFLICT");
            error.code = "BOOKING_CONFLICT";
            throw error;
          }

          const runIds = await reserveRuns(trx, runs, seats);
          const changes = {
            status: "paid",
            stripe_payment_intent: paymentIntent,
            inventory_status: "committed",
            outward_run_id: runIds[0],
            return_run_id: runIds[1] ?? null,
            ...(amountSubtotal !== null ? { subtotal_amount: amountSubtotal } : {}),
            ...(amountDiscount !== null ? { discount_amount: amountDiscount } : {}),
            ...(amountTotal !== null ? { amount: amountTotal } : {}),
          };
          const affected = await trx("bookings").where({ id: bookingId, status: "pending" }).update(changes);
          if (affected !== 1) {
            const error = new Error("BOOKING_CONFLICT");
            error.code = "BOOKING_CONFLICT";
            throw error;
          }
          return { reference: booking.reference, runIds };
        });
        return res.json({ data: result });
      } catch (error) {
        if (error?.code === "NO_CAPACITY") return res.status(409).json({ error: "no capacity" });
        if (error?.code === "BOOKING_CONFLICT") return res.status(422).json({ error: "booking state conflict" });
        logger.error(error, "NP paid booking inventory commit failed");
        return res.status(500).json({ error: "paid booking commit failed" });
      }
    });

    // Retained only to reconcile checkout holds created by older deployments.
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
