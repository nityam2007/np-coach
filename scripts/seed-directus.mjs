// Bootstrap Directus for NP Coaches: create the `settings` (singleton) and
// `services` collections, grant public read, and seed them from site-content.json.
// Idempotent — safe to re-run. Run: `npm run seed` (with Directus reachable).

import content from "../src/lib/site-content.json" with { type: "json" };
import { createDirectusApi } from "./directus-api.mjs";

const BASE = process.env.DIRECTUS_URL ?? "http://localhost:8055";
const EMAIL = process.env.DIRECTUS_ADMIN_EMAIL ?? "admin@np-coaches.co.uk";
const PASSWORD = process.env.DIRECTUS_ADMIN_PASSWORD ?? "change-me";
const STATIC_TOKEN = process.env.DIRECTUS_ADMIN_TOKEN;

const directus = createDirectusApi({ base: BASE, token: STATIC_TOKEN });
const api = directus.request;

// ---- field helpers ----
const pk = (field) => ({ field, type: "integer", schema: { is_primary_key: true, has_auto_increment: true }, meta: { hidden: true } });
const str = (field) => ({ field, type: "string", meta: {}, schema: {} });
const text = (field) => ({ field, type: "text", meta: { interface: "input-multiline" }, schema: {} });
const int = (field) => ({ field, type: "integer", meta: {}, schema: {} });
const json = (field) => ({ field, type: "json", meta: { interface: "input-code", options: { language: "json" } }, schema: {} });
// Single-file relation (M2O → directus_files). `special: ["file"]` makes Directus wire the relation.
const fileField = (field, note) => ({ field, type: "uuid", meta: { interface: "file-image", special: ["file"], note }, schema: {} });
const anyFileField = (field, note) => ({ field, type: "uuid", meta: { interface: "file", special: ["file"], note }, schema: {} });

const SETTINGS_FIELDS = [
  pk("id"),
  str("name"), str("legal_name"), str("tagline"), text("subtitle"), text("description"), str("url"), int("founded"),
  str("phone_display"), str("phone_href"), str("phone_hours"),
  str("email_general"), str("email_bookings"),
  json("email_templates"),
  str("address_line1"), str("address_line2"), str("address_city"), str("address_county"), str("address_postcode"),
  json("nav"), json("footer_columns"), json("social_links"), json("legal_links"),
  json("tour_page"),
];

const SERVICES_FIELDS = [
  pk("id"),
  { field: "sort", type: "integer", meta: { interface: "input", hidden: false }, schema: {} },
  str("title"), text("blurb"), str("href"), str("icon"),
  fileField("image", "Photo for the homepage service card."), str("image_alt"),
];

const FLEET_FIELDS = [
  pk("id"),
  { field: "sort", type: "integer", meta: { interface: "input", hidden: false }, schema: {} },
  str("slug"), str("name"), int("seats"), str("group_label"), text("summary"), json("features"),
  fileField("image", "Exterior photo shown on the fleet grid + hero."),
  str("image_alt"),  json("gallery"), // array of file ids for the detail-page gallery
  json("layout_images"), // one or more seating-plan file ids
  str("seo_title"), text("seo_description"),
];

const wysiwyg = (field) => ({ field, type: "text", meta: { interface: "input-rich-text-html" }, schema: {} });

const PAGES_FIELDS = [
  pk("id"),
  { field: "sort", type: "integer", meta: { interface: "input", hidden: false }, schema: {} },
  str("slug"), str("title"), text("subtitle"), wysiwyg("body"),
  fileField("image", "Optional hero image for the content page."),
  str("image_alt"),
  json("attachments"),
  str("seo_title"), text("seo_description"),
];

// T2 — UK Tours (per-destination SEO pages).
const TOURS_FIELDS = [
  pk("id"),
  { field: "sort", type: "integer", meta: { interface: "input", hidden: false }, schema: {} },
  str("slug"), str("destination"), text("summary"), wysiwyg("body"),
  fileField("image", "Destination hero photo."),
  str("image_alt"),
  fileField("hero_image", "Full-width 21:9 destination banner."),
  str("hero_image_alt"),
  fileField("card_image", "Destination listing-card photo."),
  str("card_image_alt"),
  str("seo_title"), text("seo_description"),
];

// T3 — Daily Express routes (timetable + days). `stops` is JSON: [{time, place, detail}].
// price_single / price_return are fares in pence (GBP); the server computes totals from these.
const ROUTES_FIELDS = [
  pk("id"),
  { field: "sort", type: "integer", meta: { interface: "input", hidden: false }, schema: {} },
  str("slug"), str("from"), str("to"), str("days"),
  { field: "price_single", type: "integer", meta: { interface: "input", note: "Single fare in pence (e.g. 1500 = £15.00)" }, schema: {} },
  { field: "price_return", type: "integer", meta: { interface: "input", note: "Return fare in pence (e.g. 2500 = £25.00)" }, schema: {} },
  text("summary"), fileField("image", "Route hero banner."), str("image_alt"),
  json("stops"),
  str("seo_title"), text("seo_description"),
];

// T4 — Blog posts.
const BLOG_FIELDS = [
  pk("id"),
  { field: "slug", type: "string", meta: {}, schema: {} },
  str("title"), text("excerpt"), str("author"),
  { field: "date", type: "date", meta: { interface: "datetime" }, schema: {} },
  wysiwyg("body"), str("seo_title"), text("seo_description"),
  fileField("thumbnail", "Blog card and article preview image."),
];

// T7 — Testimonials (homepage carousel).
const TESTIMONIALS_FIELDS = [
  pk("id"),
  { field: "sort", type: "integer", meta: { interface: "input", hidden: false }, schema: {} },
  text("quote"), str("author"), str("role"), str("company"),
  fileField("image", "Author photo (optional — falls back to initials)."),
  int("rating"),
];

// Daily Express corridor stops — drive the stop-to-stop From/To pickers.
const STOPS_FIELDS = [
  pk("id"),
  { field: "sort", type: "integer", meta: { interface: "input", hidden: false }, schema: {} },
  str("code"), str("name"), text("detail"),
];

// Home-to-school routes (timetables per school). `stops` is JSON: [{time, place}].
const SCHOOL_ROUTES_FIELDS = [
  pk("id"),
  { field: "sort", type: "integer", meta: { interface: "input", hidden: false }, schema: {} },
  str("school"), str("code"), str("name"), text("return_note"), json("stops"),
];

// T6 — form submissions (server-write only; public may CREATE the allowlisted fields, never READ).
// `created_at` is filled by Directus on insert; submissions are read by staff in the admin panel.
const datetimeCreated = { field: "created_at", type: "timestamp", meta: { interface: "datetime", readonly: true, special: ["date-created"] }, schema: {} };
const deliveryStatus = (field) => ({ field, type: "string", meta: { hidden: true, readonly: true }, schema: { default_value: "pending" } });
const deliverySentAt = (field) => ({ field, type: "timestamp", meta: { interface: "datetime", hidden: true, readonly: true }, schema: {} });

const CONTACT_SUBMISSIONS_FIELDS = [
  pk("id"),
  str("name"), str("email"), str("phone"), str("subject"), text("message"),
  datetimeCreated,
];

// Customer accounts (passwordless). Server-write only — the app manages these with the
const QUOTE_REQUESTS_FIELDS = [
  pk("id"),
  str("name"), str("email"), str("phone"), str("pickup"), str("destination"),
  { field: "outbound_date", type: "date", meta: { interface: "datetime" }, schema: {} },
  { field: "return_date", type: "date", meta: { interface: "datetime" }, schema: {} },
  int("passengers"), str("coach_size"), text("journey_details"), datetimeCreated,
];

// server token; the public can neither read nor write them. Identified by email.
const CUSTOMERS_FIELDS = [
  pk("id"),
  { field: "email", type: "string", meta: { note: "Unique customer email (lowercased)." }, schema: { is_unique: true } },
  str("name"),
  datetimeCreated,
];

// Login OTPs. Server-write only. Codes are stored HASHED (sha256 of email:code) with a
// short expiry, single-use (`consumed`) and an attempt cap — never in plaintext.
const OTP_FIELDS = [
  pk("id"),
  str("email"),
  str("code_hash"),
  { field: "expires_at", type: "timestamp", meta: { interface: "datetime" }, schema: {} },
  { field: "consumed", type: "boolean", meta: { interface: "boolean" }, schema: { default_value: false } },
  int("attempts"),
  datetimeCreated,
];


// P4 — Daily Express bookings. Written ONLY by the server (server token, no public access):
// the booking is created `pending` before payment, then set `paid` by the signed Stripe webhook.
// `stripe_session_id` is unique → webhook idempotency. Amounts stored in pence, server-computed.
const BOOKINGS_FIELDS = [
  pk("id"),
  str("reference"),
  str("from_stop"), str("to_stop"), str("route_label"),
  { field: "trip_date", type: "date", meta: { interface: "datetime" }, schema: {} },
  str("trip_type"), // "single" | "return"
  int("passengers"),
  int("amount"), // total in pence
  str("currency"),
  str("name"), str("email"), str("phone"),
  { field: "status", type: "string", meta: { interface: "select-dropdown", options: { choices: [{ text: "Pending", value: "pending" }, { text: "Paid", value: "paid" }, { text: "Failed", value: "failed" }] } }, schema: { default_value: "pending" } },
  { field: "stripe_session_id", type: "string", meta: { note: "Stripe Checkout Session id (unique — webhook idempotency)" }, schema: { is_unique: true } },
  deliveryStatus("confirmation_email_status"),
  deliverySentAt("confirmation_email_sent_at"),
  str("stripe_payment_intent"),
  datetimeCreated,
];

// P5 — Lost Property reclaim pass purchases. Server-write only; fee + VAT computed
// server-side from settings.pricing. Same pending→paid + unique session-id idempotency.
const PASS_PURCHASES_FIELDS = [
  pk("id"),
  str("reference"),
  int("amount"), str("currency"),
  str("name"), str("email"), str("phone"),
  { field: "travel_date", type: "date", meta: { interface: "datetime" }, schema: {} },
  str("travel_time"),
  { field: "school_route", type: "boolean", meta: { interface: "boolean" }, schema: { default_value: false } },
  str("school"), str("route"), str("where_left"),
  text("item_description"), text("notes"),
  { field: "status", type: "string", meta: { interface: "select-dropdown", options: { choices: [{ text: "Pending", value: "pending" }, { text: "Paid", value: "paid" }, { text: "Failed", value: "failed" }] } }, schema: { default_value: "pending" } },
  { field: "stripe_session_id", type: "string", meta: { note: "Stripe Checkout Session id (unique — webhook idempotency)" }, schema: { is_unique: true } },
  str("stripe_payment_intent"),
  deliveryStatus("confirmation_email_status"),
  deliverySentAt("confirmation_email_sent_at"),
  deliveryStatus("staff_email_status"),
  deliverySentAt("staff_email_sent_at"),
  datetimeCreated,
];

async function ensureCollection(name, meta, fields) {
  const existing = new Set((await api("/collections?limit=-1")).map((c) => c.collection));
  if (existing.has(name)) {
    console.log(`• collection "${name}" already exists`);
    return;
  }
  await api("/collections", { method: "POST", body: JSON.stringify({ collection: name, meta, schema: {}, fields }) });
  console.log(`✓ created collection "${name}"`);
}

async function ensureField(collection, field) {
  const fields = await api(`/fields/${collection}`);
  if (fields.some((f) => f.field === field.field)) return;
  await api(`/fields/${collection}`, { method: "POST", body: JSON.stringify(field) });
  console.log(`✓ added field "${collection}.${field.field}"`);
}

async function ensurePublicRead(collection) {
  const policies = await api("/policies?limit=-1");
  const publicPolicy = policies.find((p) => p.name === "$t:public_label");
  if (!publicPolicy) throw new Error("public policy not found");
  const existing = await api(
    `/permissions?filter[policy][_eq]=${publicPolicy.id}&filter[collection][_eq]=${collection}&filter[action][_eq]=read&limit=1`,
  );
  if (existing.length) {
    console.log(`• public read on "${collection}" already granted`);
    return;
  }
  await api("/permissions", {
    method: "POST",
    body: JSON.stringify({ policy: publicPolicy.id, collection, action: "read", fields: ["*"], permissions: {}, validation: {} }),
  });
  console.log(`✓ granted public read on "${collection}"`);
}

// Grant the Public policy CREATE on a collection. Anonymous visitors can submit
// the form but cannot READ submissions (no read grant). Uses fields ["*"]: a
// field-level allowlist is a "custom permission rule" gated by the Directus edition,
// whereas a standard create rule is allowed. The server action controls exactly which
// fields are written, and the collection only has the fields we defined.
async function ensurePublicCreate(collection) {
  const policies = await api("/policies?limit=-1");
  const publicPolicy = policies.find((p) => p.name === "$t:public_label");
  if (!publicPolicy) throw new Error("public policy not found");
  const existing = await api(
    `/permissions?filter[policy][_eq]=${publicPolicy.id}&filter[collection][_eq]=${collection}&filter[action][_eq]=create&limit=1`,
  );
  if (existing.length) {
    console.log(`• public create on "${collection}" already granted`);
    return;
  }
  await api("/permissions", {
    method: "POST",
    body: JSON.stringify({ policy: publicPolicy.id, collection, action: "create", fields: ["*"], permissions: {}, validation: {} }),
  });
  console.log(`✓ granted public create on "${collection}"`);
}

// Brand the admin panel (project name/colour, navy navigation, brand fonts, login note).
async function revokePublicCreate(collection) {
  const policies = await api("/policies?limit=-1");
  const publicPolicy = policies.find((p) => p.name === "$t:public_label");
  if (!publicPolicy) throw new Error("public policy not found");
  const existing = await api(`/permissions?filter[policy][_eq]=${publicPolicy.id}&filter[collection][_eq]=${collection}&filter[action][_eq]=create&limit=-1`);
  for (const permission of existing) {
    await api(`/permissions/${permission.id}`, { method: "DELETE" });
  }
  console.log(`✓ anonymous create removed from "${collection}"`);
}

async function applyBranding() {
  await api("/settings", {
    method: "PATCH",
    body: JSON.stringify({
      project_name: "NP Coaches",
      project_descriptor: "Content Management",
      project_color: "#0e0f27",
      default_appearance: "light",
      theme_light_overrides: {
        primary: "#2563eb",
        secondary: "#0e0f27",
        fonts: { sans: { fontFamily: '"Inter", system-ui, sans-serif' } },
        navigation: {
          background: "#0e0f27",
          project: { background: "#0e0f27", foreground: "#fdfdfd" },
          modules: { background: "#0e0f27", button: { foregroundActive: "#2563eb" } },
        },
      },
      public_note: "**NP Coaches** — staff sign-in. Contact your administrator for access.",
    }),
  });
  console.log("✓ applied admin branding");
}

// Customer and operational records are live business data, never seed data.
// Snapshot their counts around the additive bootstrap and abort if any count falls.
const PROTECTED_DATA_COLLECTIONS = [
  "customers",
  "bookings",
  "pass_purchases",
  "contact_submissions",
  "quote_requests",
];

async function itemCount(collection) {
  const rows = await api(`/items/${collection}?aggregate[count]=*`);
  const value = rows?.[0]?.count;
  const raw =
    value && typeof value === "object"
      ? value.id ?? Object.values(value)[0]
      : value;
  const count = Number(raw);
  if (!Number.isSafeInteger(count) || count < 0) {
    throw new Error(`Could not verify protected row count for "${collection}"`);
  }
  return count;
}

async function protectedDataCounts() {
  const counts = {};
  for (const collection of PROTECTED_DATA_COLLECTIONS) {
    counts[collection] = await itemCount(collection);
  }
  return counts;
}

async function assertProtectedDataPreserved(before) {
  const after = await protectedDataCounts();
  for (const collection of PROTECTED_DATA_COLLECTIONS) {
    if (after[collection] < before[collection]) {
      throw new Error(
        `Protected data loss detected in "${collection}": ${before[collection]} -> ${after[collection]}`,
      );
    }
  }
  console.log(`✓ protected data preserved: ${JSON.stringify(after)}`);
}

async function run() {
  console.log(`Seeding Directus at ${BASE} ...`);
  if (!directus.hasToken()) {
    directus.setToken(
      (await api("/auth/login", { method: "POST", body: JSON.stringify({ email: EMAIL, password: PASSWORD }) })).access_token,
    );
  }

  await ensureCollection("settings", { singleton: true, icon: "settings", note: "Global site content" }, SETTINGS_FIELDS);
  await ensureCollection("services", { sort_field: "sort", icon: "category", note: "Homepage service cards" }, SERVICES_FIELDS);
  await ensureCollection("fleet", { sort_field: "sort", icon: "directions_bus", note: "Fleet vehicles (SEO landing pages)" }, FLEET_FIELDS);
  await ensureCollection("pages", { sort_field: "sort", icon: "article", note: "Editable content pages (About, Contact, …)" }, PAGES_FIELDS);
  await ensureCollection("tours", { sort_field: "sort", icon: "tour", note: "UK Tours destinations (SEO landing pages)" }, TOURS_FIELDS);
  await ensureCollection("routes", { sort_field: "sort", icon: "route", note: "Daily Express routes + timetables" }, ROUTES_FIELDS);
  await ensureCollection("stops", { sort_field: "sort", icon: "pin_drop", note: "Daily Express corridor stops (booking From/To)" }, STOPS_FIELDS);
  await ensureCollection("school_routes", { sort_field: "sort", icon: "directions_bus", note: "Home-to-school route timetables" }, SCHOOL_ROUTES_FIELDS);
  await ensureCollection("blog_posts", { icon: "feed", note: "Blog posts" }, BLOG_FIELDS);
  await ensureCollection("testimonials", { sort_field: "sort", icon: "format_quote", note: "Homepage testimonials" }, TESTIMONIALS_FIELDS);
  await ensureCollection("contact_submissions", { icon: "mail", note: "Contact form submissions (read in admin)" }, CONTACT_SUBMISSIONS_FIELDS);
  await ensureCollection("bookings", { icon: "confirmation_number", note: "Daily Express bookings (server-write only; Stripe)" }, BOOKINGS_FIELDS);
  await ensureCollection("quote_requests", { icon: "request_quote", note: "Coach-hire quote requests (read in admin)" }, QUOTE_REQUESTS_FIELDS);
  await ensureCollection("pass_purchases", { icon: "luggage", note: "Lost Property pass purchases (server-write only; Stripe)" }, PASS_PURCHASES_FIELDS);
  await ensureCollection("customers", { icon: "person", note: "Customer accounts (server-write only; passwordless)" }, CUSTOMERS_FIELDS);
  await ensureCollection("otp_codes", { icon: "password", note: "Login OTP codes (server-write only; hashed, single-use)" }, OTP_FIELDS);

  const protectedBefore = await protectedDataCounts();

  // Fields added after a collection already exists (idempotent extension).
  await ensureField("settings", json("stats"));
  await ensureField("settings", json("accreditations"));
  await ensureField("settings", json("email_templates"));
  await ensureField("settings", json("coverage"));
  await ensureField("settings", json("faqs"));
  await ensureField("settings", json("pricing")); // configurable fees + per-fee VAT rates
  await ensureField("settings", fileField("logo", "Site logo (header + footer)."));
  await ensureField("settings", json("accreditation_logos")); // { "<accreditation name>": "<file id>" }
  await ensureField("settings", json("homepage")); // bespoke homepage copy blob (see HomepageContent)
  await ensureField("settings", json("tour_page"));
  await ensureField("settings", json("social_links"));
  await ensureField("settings", json("fleet_page")); // fleet listing/detail shared copy and booking steps
  await ensureField("settings", fileField("school_image", "Homepage school-transport block photo."));
  await ensureField("settings", str("school_image_alt"));
  await ensureField("services", fileField("image", "Photo for the homepage service card."));
  await ensureField("services", str("image_alt"));
  await ensureField("services", str("icon")); // icon key for the service card
  await ensureField("settings", fileField("hero_image", "Homepage hero background photo."));
  await ensureField("settings", anyFileField("hero_video", "Optional muted looping homepage hero video."));
  await ensureField("settings", str("client_media_revision"));
  await ensureField("settings", str("hero_image_alt"));
  await ensureField("settings", fileField("home_to_school_image", "Home-to-school page hero banner."));
  await ensureField("settings", str("home_to_school_image_alt"));
  await ensureField("settings", fileField("daily_express_image", "Daily Express page hero banner."));
  await ensureField("settings", str("daily_express_image_alt"));
  // Testimonials gained author org/photo/rating (mockup cards).
  await ensureField("testimonials", str("company"));
  await ensureField("testimonials", fileField("image", "Author photo (optional)."));
  await ensureField("testimonials", { field: "rating", type: "integer", meta: { interface: "input", note: "Star rating 1–5" }, schema: {} });
  // Routes gained fares (P4) — add to any pre-existing routes collection.
  await ensureField("routes", { field: "price_single", type: "integer", meta: { interface: "input", note: "Single fare in pence" }, schema: {} });
  await ensureField("routes", { field: "price_return", type: "integer", meta: { interface: "input", note: "Return fare in pence" }, schema: {} });
  // Bookings moved to stop-to-stop — add from/to stop codes to any pre-existing bookings collection.
  await ensureField("bookings", str("from_stop"));
  await ensureField("bookings", str("to_stop"));
  // Media fields (added to pre-existing collections).
  await ensureField("fleet", fileField("image", "Exterior photo."));
  await ensureField("fleet", json("gallery"));
  await ensureField("fleet", str("group_label"));
  await ensureField("fleet", str("image_alt"));
  await ensureField("fleet", json("layout_images"));
  await ensureField("bookings", deliveryStatus("confirmation_email_status"));
  await ensureField("bookings", deliverySentAt("confirmation_email_sent_at"));
  await ensureField("pass_purchases", deliveryStatus("confirmation_email_status"));
  await ensureField("pass_purchases", deliverySentAt("confirmation_email_sent_at"));
  await ensureField("pass_purchases", deliveryStatus("staff_email_status"));
  await ensureField("pass_purchases", deliverySentAt("staff_email_sent_at"));
  await ensureField("pages", fileField("image", "Optional hero image for the content page."));
  await ensureField("pages", str("image_alt"));
  await ensureField("pages", json("attachments"));
  await ensureField("tours", fileField("image", "Destination hero photo."));
  await ensureField("tours", str("image_alt"));
  await ensureField("tours", fileField("hero_image", "Full-width 21:9 destination banner."));
  await ensureField("tours", str("hero_image_alt"));
  await ensureField("tours", fileField("card_image", "Destination listing-card photo."));
  await ensureField("tours", str("card_image_alt"));
  await ensureField("routes", fileField("image", "Route hero banner."));
  await ensureField("routes", str("image_alt"));
  await ensureField("settings", json("school_transport"));

  await ensureField("blog_posts", fileField("thumbnail", "Blog card and article preview image."));
  await ensurePublicRead("settings");
  await ensurePublicRead("services");
  await ensurePublicRead("fleet");
  await ensurePublicRead("pages");
  await ensurePublicRead("tours");
  await ensurePublicRead("routes");
  await ensurePublicRead("stops");
  await ensurePublicRead("school_routes");
  await ensurePublicRead("blog_posts");
  await ensurePublicRead("testimonials");
  await revokePublicCreate("contact_submissions");

  await revokePublicCreate("quote_requests");
  // Pricing: merge in any keys missing from the live row (e.g. newly-added fares),
  // but never overwrite values the client has already tuned in Directus.
  const currentSettings = await api("/items/settings");
  const mergedPricing = { ...content.pricing, ...(currentSettings?.pricing ?? {}) };
  const pricingChanged = JSON.stringify(mergedPricing) !== JSON.stringify(currentSettings?.pricing ?? null);
  // Homepage copy: same strategy — add newly-introduced keys, keep client edits.
  const mergedHomepage = { ...content.homepage, ...(currentSettings?.homepage ?? {}) };
  const storedEmailTemplates = currentSettings?.email_templates ?? {};
  const mergedEmailTemplates = {
    ...storedEmailTemplates,
    ...Object.fromEntries(Object.entries(content.emailTemplates).map(([key, defaults]) => [
      key,
      { ...defaults, ...(storedEmailTemplates[key] ?? {}) },
    ])),
  };
  // Fleet listing/detail shared copy follows the same preserve-editor-edits strategy.
  const mergedFleetPage = { ...content.fleetPage, ...(currentSettings?.fleet_page ?? {}) };
  const mergedTourPage = { ...content.tourPage, ...(currentSettings?.tour_page ?? {}) };
  const socialLinksMissing = !Array.isArray(currentSettings?.social_links) || currentSettings.social_links.length === 0;
  const homepageChanged = JSON.stringify(mergedHomepage) !== JSON.stringify(currentSettings?.homepage ?? null);
  const emailTemplatesChanged = JSON.stringify(mergedEmailTemplates) !== JSON.stringify(currentSettings?.email_templates ?? null);
  const fleetPageChanged = JSON.stringify(mergedFleetPage) !== JSON.stringify(currentSettings?.fleet_page ?? null);
  const tourPageChanged = JSON.stringify(mergedTourPage) !== JSON.stringify(currentSettings?.tour_page ?? null);

  // Seed the singleton only once. After that, Directus is the source of truth:
  // routine deploys may add missing nested keys but never reset editor-managed values.
  const settingsDefaults = {
      name: content.name,
      legal_name: content.legalName,
      tagline: content.tagline,
      subtitle: content.subtitle,
      description: content.description,
      url: content.url,
      founded: content.founded,
      phone_display: content.phone.display,
      phone_href: content.phone.href,
      phone_hours: content.phone.hours,
      email_general: content.email.general,
      email_templates: mergedEmailTemplates,
      email_bookings: content.email.bookings,
      address_line1: content.address.line1,
      address_line2: content.address.line2,
      address_city: content.address.city,
      address_county: content.address.county,
      address_postcode: content.address.postcode,
      nav: content.nav,
      footer_columns: content.footerColumns,
      legal_links: content.legalLinks,
      stats: content.stats,
      accreditations: content.accreditations,
      coverage: content.coverage,
      faqs: content.faqs,
      pricing: mergedPricing,
      homepage: mergedHomepage,
      fleet_page: mergedFleetPage,
      tour_page: mergedTourPage,
      social_links: content.socialLinks,
  };
  const hasLiveSettings = currentSettings?.id != null;
  const settingsPatch = hasLiveSettings ? {} : settingsDefaults;

  if (hasLiveSettings) {
    if (pricingChanged) settingsPatch.pricing = mergedPricing;
    if (homepageChanged) settingsPatch.homepage = mergedHomepage;
    if (emailTemplatesChanged) settingsPatch.email_templates = mergedEmailTemplates;
    if (fleetPageChanged) settingsPatch.fleet_page = mergedFleetPage;
    if (tourPageChanged) settingsPatch.tour_page = mergedTourPage;
    if (socialLinksMissing) settingsPatch.social_links = content.socialLinks;
  }

  if (Object.keys(settingsPatch).length) {
    await api("/items/settings", {
      method: "PATCH",
      body: JSON.stringify(settingsPatch),
    });
    console.log(
      hasLiveSettings ? "✓ settings: added missing nested keys; live values preserved" : "✓ settings: first-run defaults seeded",
    );
  } else {
    console.log("• settings already populated — all live values preserved");
  }

  // Services — only seed if empty, to preserve any edits made in Directus.
  const services = await api("/items/services?limit=1");
  if (services.length === 0) {
    await api("/items/services", {
      method: "POST",
      body: JSON.stringify(content.services.map((s, i) => ({
        title: s.title, blurb: s.blurb, href: s.href, icon: s.icon,
        image_alt: s.imageAlt, sort: i + 1,
      }))),
    });
    console.log(`✓ seeded ${content.services.length} services`);
  } else {
    // Backfill icons on any pre-existing service row that predates the `icon` field,
    // matched by title. Never overwrites an icon the client has already set.
    const iconByTitle = new Map(content.services.map((s) => [s.title, s.icon]));
    const existing = await api("/items/services?fields=id,title,icon&limit=-1");
    for (const row of existing) {
      const icon = iconByTitle.get(row.title);
      if (icon && !row.icon) {
        await api(`/items/services/${row.id}`, { method: "PATCH", body: JSON.stringify({ icon }) });
        console.log(`✓ services/${row.title}.icon set`);
      }
    }
    console.log("• services already populated — skipped seed (icons backfilled where missing)");
  }

  // Fleet — only seed if empty.
  const fleet = await api("/items/fleet?limit=1");
  if (fleet.length === 0) {
    await api("/items/fleet", {
      method: "POST",
      body: JSON.stringify(
        content.fleet.map((v, i) => ({
          slug: v.slug,
          name: v.name,
          seats: v.seats,
          summary: v.summary,
          image_alt: v.imageAlt,
          features: v.features,
          group_label: v.groupLabel,
          seo_title: v.seoTitle,
          seo_description: v.seoDescription,
          sort: i + 1,
        })),
      ),
    });
    console.log(`✓ seeded ${content.fleet.length} fleet vehicles`);
  } else {
    console.log("• fleet already populated — skipped");
  }

  // Backfill presentation fields added after the original fleet seed. Existing CMS
  // values always win, so rerunning the seed remains safe for editor changes.
  const existingFleet = await api("/items/fleet?fields=id,slug,group_label,image_alt&limit=-1");
  for (const vehicle of existingFleet) {
    if (vehicle.group_label && vehicle.image_alt) continue;
    const seed = content.fleet.find((item) => item.slug === vehicle.slug);
    if (!seed) continue;
    await api(`/items/fleet/${vehicle.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        ...(!vehicle.group_label ? { group_label: seed.groupLabel } : {}),
        ...(!vehicle.image_alt ? { image_alt: seed.imageAlt } : {}),
      }),
    });
    console.log(`✓ fleet/${vehicle.slug}.group_label set`);
  }

  // Pages — insert per-slug so a partial seed gets backfilled without clobbering
  // any page the client has edited (existing slugs are left untouched).
  const existingPages = await api("/items/pages?fields=slug&limit=-1");
  const havePage = new Set(existingPages.map((p) => p.slug));
  const missingPages = content.pages.filter((p) => !havePage.has(p.slug));
  if (missingPages.length) {
    await api("/items/pages", {
      method: "POST",
      body: JSON.stringify(
        missingPages.map((p, i) => ({
          slug: p.slug,
          title: p.title,
          subtitle: p.subtitle,
          body: p.body,
          image_alt: p.imageAlt,
          attachments: p.attachments,
          seo_title: p.seoTitle,
          seo_description: p.seoDescription,
          sort: havePage.size + i + 1,
        })),
      ),
    });
    console.log(`✓ seeded ${missingPages.length} missing pages (${missingPages.map((p) => p.slug).join(", ")})`);
  } else {
    console.log("• all pages present — skipped");
  }

  // Tours — only seed if empty.
  const tours = await api("/items/tours?limit=1");
  if (tours.length === 0) {
    await api("/items/tours", {
      method: "POST",
      body: JSON.stringify(
        content.tours.map((t, i) => ({
          slug: t.slug,
          destination: t.destination,
          summary: t.summary,
          body: t.body,
          image_alt: t.imageAlt,
          hero_image_alt: t.heroImageAlt,
          card_image_alt: t.cardImageAlt,
          seo_title: t.seoTitle,
          seo_description: t.seoDescription,
          sort: i + 1,
        })),
      ),
    });
    console.log(`✓ seeded ${content.tours.length} tours`);
  } else {
    console.log("• tours already populated — skipped");
  }

  // Insert any tour from content that isn't in Directus yet (e.g. new destinations).
  const existingTourSlugs = new Set((await api("/items/tours?fields=slug&limit=-1")).map((t) => t.slug));
  const maxTourSort = Math.max(0, ...(await api("/items/tours?fields=sort&limit=-1")).map((t) => t.sort ?? 0));
  let tourSort = maxTourSort;
  for (const t of content.tours) {
    if (existingTourSlugs.has(t.slug)) continue;
    tourSort += 1;
    await api("/items/tours", {
      method: "POST",
      body: JSON.stringify({
        slug: t.slug, destination: t.destination, summary: t.summary, body: t.body,
        image_alt: t.imageAlt,
        hero_image_alt: t.heroImageAlt,
        card_image_alt: t.cardImageAlt,
        seo_title: t.seoTitle, seo_description: t.seoDescription, sort: tourSort,
      }),
    });
    console.log(`✓ added tour "${t.slug}"`);
  }

  // Routes — only seed if empty.
  const routes = await api("/items/routes?limit=1");
  if (routes.length === 0) {
    await api("/items/routes", {
      method: "POST",
      body: JSON.stringify(
        content.routes.map((r, i) => ({
          slug: r.slug,
          from: r.from,
          to: r.to,
          days: r.days,
          price_single: r.priceSingle,
          price_return: r.priceReturn,
          summary: r.summary,
          image_alt: r.imageAlt,          stops: r.stops,
          seo_title: r.seoTitle,
          seo_description: r.seoDescription,
          sort: i + 1,
        })),
      ),
    });
    console.log(`✓ seeded ${content.routes.length} routes`);
  } else {
    console.log("• routes already populated — skipped");
  }

  // Backfill fares on pre-existing routes that don't have a price yet (P4). Won't
  // overwrite a price the client has already set, so it's safe to re-run.
  const existingRoutes = await api("/items/routes?fields=id,slug,price_single&limit=-1");
  for (const route of existingRoutes) {
    if (route.price_single != null) continue;
    const seed = content.routes.find((r) => r.slug === route.slug);
    if (!seed) continue;
    await api(`/items/routes/${route.id}`, {
      method: "PATCH",
      body: JSON.stringify({ price_single: seed.priceSingle, price_return: seed.priceReturn }),
    });
    console.log(`✓ backfilled fares for route "${route.slug}"`);
  }

  // Stops — only seed if empty.
  const stops = await api("/items/stops?limit=1");
  if (stops.length === 0) {
    await api("/items/stops", {
      method: "POST",
      body: JSON.stringify(content.stops.map((s, i) => ({ code: s.code, name: s.name, detail: s.detail, sort: i + 1 }))),
    });
    console.log(`✓ seeded ${content.stops.length} stops`);
  } else {
    console.log("• stops already populated — skipped");
  }

  // School routes — only seed if empty.
  const schoolRoutes = await api("/items/school_routes?limit=1");
  if (schoolRoutes.length === 0) {
    await api("/items/school_routes", {
      method: "POST",
      body: JSON.stringify(
        content.schoolRoutes.map((r, i) => ({
          school: r.school, code: r.code, name: r.name, return_note: r.returnNote, stops: r.stops, sort: i + 1,
        })),
      ),
    });
    console.log(`✓ seeded ${content.schoolRoutes.length} school routes`);
  } else {
    console.log("• school routes already populated — skipped");
  }

  // Blog posts — only seed if empty.
  const posts = await api("/items/blog_posts?limit=1");
  if (posts.length === 0) {
    await api("/items/blog_posts", {
      method: "POST",
      body: JSON.stringify(
        content.blogPosts.map((p) => ({
          slug: p.slug,
          title: p.title,
          excerpt: p.excerpt,
          author: p.author,
          date: p.date,
          body: p.body,
          seo_title: p.seoTitle,
          seo_description: p.seoDescription,
          thumbnail: p.thumbnail ?? null,
        })),
      ),
    });
    console.log(`✓ seeded ${content.blogPosts.length} blog posts`);
  } else {
    console.log("• blog posts already populated — skipped");
  }

  // Testimonials — only seed if empty.
  const testimonials = await api("/items/testimonials?limit=1");
  if (testimonials.length === 0) {
    await api("/items/testimonials", {
      method: "POST",
      body: JSON.stringify(content.testimonials.map((t, i) => ({ ...t, sort: i + 1 }))),
    });
    console.log(`✓ seeded ${content.testimonials.length} testimonials`);
  } else {
    console.log("• testimonials already populated — skipped");
  }

  await applyBranding();
  await assertProtectedDataPreserved(protectedBefore);

  console.log("Done.");
}

run().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
