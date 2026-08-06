const DEFAULT_REQUEST_INTERVAL_MS = 50;
const DEFAULT_MAX_RETRIES = 10;
const DEFAULT_REQUEST_TIMEOUT_MS = 30_000;
const MAX_RETRY_DELAY_MS = 60_000;
const RETRYABLE_STATUSES = new Set([408, 425, 429, 502, 503, 504]);

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function environmentInteger(name, fallback, minimum = 0) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value >= minimum ? Math.floor(value) : fallback;
}

function retryAfterDelay(response) {
  const value = response.headers.get("retry-after");
  if (!value) return 0;

  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1_000);

  const date = Date.parse(value);
  return Number.isFinite(date) ? Math.max(0, date - Date.now()) : 0;
}

function retryMessageDelay(message) {
  const match = message.match(/retry after\s+([\d.]+)\s*(ms|s|seconds?)/i);
  if (!match) return 0;
  return Number(match[1]) * (match[2].toLowerCase() === "ms" ? 1 : 1_000);
}

function retryDelay(response, message, attempt) {
  // Directus includes a precise millisecond delay in the error message. Prefer it
  // over Retry-After, whose numeric form is defined as seconds by HTTP.
  const advertised = retryMessageDelay(message) || retryAfterDelay(response);
  const backoff = Math.min(10_000, 250 * 2 ** attempt);
  return Math.min(MAX_RETRY_DELAY_MS, Math.ceil(Math.max(advertised, backoff) + 100));
}

function networkRetryDelay(attempt) {
  return Math.min(MAX_RETRY_DELAY_MS, 500 * 2 ** attempt);
}

/**
 * Directus bootstrap API client.
 *
 * Administrative seed/configure/media runs make many sequential requests from one
 * container IP. Pacing stays below Directus's default 50 req/s limit; bounded
 * retries absorb a shared-bucket burst, a rolling deploy, or a transient gateway.
 */
export function createDirectusApi({ base, token: initialToken = null }) {
  const requestIntervalMs = environmentInteger(
    "DIRECTUS_BOOTSTRAP_REQUEST_INTERVAL_MS",
    DEFAULT_REQUEST_INTERVAL_MS,
  );
  const maxRetries = environmentInteger(
    "DIRECTUS_BOOTSTRAP_MAX_RETRIES",
    DEFAULT_MAX_RETRIES,
  );
  const requestTimeoutMs = environmentInteger(
    "DIRECTUS_BOOTSTRAP_REQUEST_TIMEOUT_MS",
    DEFAULT_REQUEST_TIMEOUT_MS,
    1,
  );

  let token = initialToken || null;
  let nextRequestAt = 0;

  async function paceRequest() {
    const delay = nextRequestAt - Date.now();
    if (delay > 0) await wait(delay);
    nextRequestAt = Date.now() + requestIntervalMs;
  }

  async function request(path, options = {}, attempt = 0) {
    await paceRequest();

    const isForm = options.body instanceof FormData;
    let response;
    try {
      response = await fetch(`${base}${path}`, {
        ...options,
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(typeof options.body === "string" && !isForm
            ? { "Content-Type": "application/json" }
            : {}),
          ...(options.headers ?? {}),
        },
        signal: options.signal ?? AbortSignal.timeout(requestTimeoutMs),
      });
    } catch (error) {
      if (attempt < maxRetries) {
        const delay = networkRetryDelay(attempt);
        console.warn(
          `Directus ${options.method ?? "GET"} ${path} failed (${error.name}); retrying in ${delay}ms (${attempt + 1}/${maxRetries})`,
        );
        await wait(delay);
        return request(path, options, attempt + 1);
      }
      throw error;
    }

    const text = await response.text();
    let json = {};
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      // Preserve the raw response text for the error below.
    }

    if (!response.ok) {
      const message = json?.errors?.[0]?.message ?? text;
      if (RETRYABLE_STATUSES.has(response.status) && attempt < maxRetries) {
        const delay = retryDelay(response, message, attempt);
        console.warn(
          `Directus ${options.method ?? "GET"} ${path} returned ${response.status}; retrying in ${delay}ms (${attempt + 1}/${maxRetries})`,
        );
        await wait(delay);
        return request(path, options, attempt + 1);
      }

      throw Object.assign(
        new Error(`${options.method ?? "GET"} ${path} → ${response.status}: ${message}`),
        { status: response.status },
      );
    }

    return json.data;
  }

  return {
    hasToken: () => Boolean(token),
    request,
    setToken(value) {
      token = value || null;
    },
  };
}
