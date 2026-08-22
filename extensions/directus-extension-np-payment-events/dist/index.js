const PAYMENT_COLLECTIONS = new Set(["bookings", "pass_purchases"]);

function itemKeys(event) {
  const values = Array.isArray(event.keys) ? event.keys : [event.key ?? event.keys];
  return values
    .map((value) => typeof value === "string" && /^\d+$/.test(value) ? Number(value) : value)
    .filter((value) => Number.isInteger(value) && value > 0)
    .slice(0, 100);
}

const paymentEventsHook = ({ action }, { env, logger }) => {
  const notifyPaid = async (event) => {
    if (!PAYMENT_COLLECTIONS.has(event.collection) || event.payload?.status !== "paid") return;

    const baseUrl = String(env.WEB_INTERNAL_URL || "").replace(/\/+$/, "");
    const secret = String(env.INTERNAL_API_SECRET || "");
    if (!/^https?:\/\//.test(baseUrl) || secret.length < 32) {
      logger.error("NP payment hook is missing WEB_INTERNAL_URL or INTERNAL_API_SECRET");
      return;
    }

    for (const id of itemKeys(event)) {
      try {
        const response = await fetch(`${baseUrl}/api/internal/payment-status`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${secret}`,
          },
          body: JSON.stringify({ collection: event.collection, id }),
          signal: AbortSignal.timeout(15_000),
        });
        if (!response.ok) logger.error(`NP payment reconciliation returned ${response.status} for ${event.collection}/${id}`);
      } catch (error) {
        logger.error(error, `NP payment reconciliation failed for ${event.collection}/${id}`);
      }
    }
  };

  action("items.create", notifyPaid);
  action("items.update", notifyPaid);
};

export default paymentEventsHook;