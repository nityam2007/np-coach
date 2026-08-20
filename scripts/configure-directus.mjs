// Configure the Directus admin UX for NP Coaches: organise collections into groups,
// improve field metadata (interfaces, notes, widths, layout), set display templates,
// status colours, list-view defaults, and build an Insights dashboard.
//
// Idempotent — safe to re-run. Run AFTER `npm run seed` (collections must exist):
//   npm run configure   (with Directus reachable)
//
// This only touches admin-panel metadata (collection/field `meta`, dashboards/panels).
// It never changes content or schema, so it can't break the running app.

import { createDirectusApi } from "./directus-api.mjs";

const BASE = process.env.DIRECTUS_URL ?? "http://localhost:8055";
const EMAIL = process.env.DIRECTUS_ADMIN_EMAIL ?? "admin@np-coaches.co.uk";
const PASSWORD = process.env.DIRECTUS_ADMIN_PASSWORD ?? "change-me";
const STATIC_TOKEN = process.env.DIRECTUS_ADMIN_TOKEN;

const directus = createDirectusApi({ base: BASE, token: STATIC_TOKEN });
const api = directus.request;

// ---- groups (folder collections) ----
const GROUPS = [
  { collection: "grp_content", name: "Content", icon: "article", color: "#2563eb", sort: 1 },
  { collection: "grp_marketing", name: "Marketing", icon: "campaign", color: "#2563eb", sort: 2 },
  { collection: "grp_daily_express", name: "Daily Express", icon: "directions_bus", color: "#2563eb", sort: 3 },
  { collection: "grp_orders", name: "Bookings & Payments", icon: "payments", color: "#16a34a", sort: 4 },
  { collection: "grp_leads", name: "Leads", icon: "inbox", color: "#d97706", sort: 5 },
  { collection: "grp_accounts", name: "Accounts", icon: "group", color: "#6b7280", sort: 6 },
];

async function ensureGroup(g, existing) {
  if (existing.has(g.collection)) {
    await api(`/collections/${g.collection}`, {
      method: "PATCH",
      body: JSON.stringify({ meta: { icon: g.icon, color: g.color, sort: g.sort, note: null } }),
    });
    console.log(`• group "${g.name}" updated`);
    return;
  }
  // A group is a collection with no fields/schema (a folder).
  await api("/collections", {
    method: "POST",
    body: JSON.stringify({ collection: g.collection, meta: { icon: g.icon, color: g.color, sort: g.sort, note: g.name }, schema: null }),
  });
  existing.add(g.collection);
  console.log(`✓ created group "${g.name}"`);
}

// ---- per-collection meta: which group, order, icon, colour, display template, archive ----
const COLLECTION_META = {
  // Content
  pages: { group: "grp_content", sort: 1, icon: "article", display_template: "{{title}}", note: "Editable site pages (About, Contact, FAQs, legal…). Edit copy here; new pages appear automatically at /their-slug." },
  blog_posts: { group: "grp_content", sort: 2, icon: "feed", display_template: "{{title}}", note: "Blog / news articles. Publish by setting Status to Published." },
  // Marketing
  fleet: { group: "grp_marketing", sort: 1, icon: "directions_bus", display_template: "{{name}} ({{seats}} seats)", note: "Your coaches. Each vehicle gets its own page. Add a photo, seats and features." },
  tours: { group: "grp_marketing", sort: 2, icon: "tour", display_template: "{{destination}}", note: "UK Tours destinations. Each gets its own landing page." },
  testimonials: { group: "grp_marketing", sort: 3, icon: "format_quote", display_template: "{{author}} — {{role}}", note: "Customer reviews shown on the homepage." },
  services: { group: "grp_marketing", sort: 4, icon: "category", display_template: "{{title}}", note: "The four service cards on the homepage." },
  // Daily Express
  routes: { group: "grp_daily_express", sort: 1, icon: "route", display_template: "{{from}} → {{to}}", note: "Daily Express route pages + their timetables." },
  stops: { group: "grp_daily_express", sort: 2, icon: "pin_drop", display_template: "{{name}}", note: "The pickup/drop-off stops customers pick when booking. Don't change a stop's Code once live." },
  school_routes: { group: "grp_daily_express", sort: 3, icon: "directions_bus", display_template: "{{code}} — {{name}}", note: "Home-to-school route timetables." },
  // Bookings & payments
  bookings: {
    group: "grp_orders",
    sort: 1,
    icon: "confirmation_number",
    color: "#16a34a",
    display_template: "{{reference}} · {{route_label}} · {{status}}",
    archive_field: "status",
    archive_value: "failed",
    sort_field: "created_at",
    note: "Daily Express ticket orders. PAID = money received. PENDING = customer started but hasn't paid yet (an abandoned cart if it stays pending). Created automatically — don't add rows by hand.",
  },
  pass_purchases: {
    group: "grp_orders",
    sort: 2,
    icon: "luggage",
    color: "#16a34a",
    display_template: "{{reference}} · {{item_description}} · {{status}}",
    archive_field: "status",
    archive_value: "failed",
    sort_field: "created_at",
    note: "Lost-property pass payments (£5 admin fee). PAID = received. PENDING = started, not paid. Created automatically.",
  },
  // Leads
  contact_submissions: { group: "grp_leads", sort: 1, icon: "mail", display_template: "{{name}} — {{subject}}", sort_field: "created_at", note: "Messages from the Contact and Get-a-Quote forms. Reply by email or phone." },
  // Accounts
  customers: { group: "grp_accounts", sort: 1, icon: "person", display_template: "{{name}} — {{email}}", note: "Customer accounts (created automatically at checkout / login). No passwords are stored." },
  otp_codes: { group: "grp_accounts", sort: 2, icon: "password", display_template: "{{email}}", note: "One-time login codes. Technical — you never need to open this." },
  // Settings stays top-level (singleton)
  settings: { sort: 10, icon: "settings", note: "Global site content: contact details, navigation, homepage copy, prices, FAQs and transactional email copy." },
};

async function applyCollectionMeta(collection, meta) {
  await api(`/collections/${collection}`, { method: "PATCH", body: JSON.stringify({ meta }) });
  console.log(`✓ ${collection}: grouped/templated`);
}

// ---- field metadata: interface, note, width, options, sort, hidden, readonly ----
// Only the fields that benefit from explicit UX are listed; others keep their defaults.
const STATUS_CHOICES = [
  { text: "Pending", value: "pending", color: "#d97706" },
  { text: "Paid", value: "paid", color: "#16a34a" },
  { text: "Failed", value: "failed", color: "#dc2626" },
];

const FIELD_META = {
  bookings: [
    { field: "reference", meta: { width: "half", readonly: true, note: "Auto-generated booking reference (NPX-…)." } },
    { field: "status", meta: { width: "half", interface: "select-dropdown", display: "labels", options: { choices: STATUS_CHOICES }, display_options: { choices: STATUS_CHOICES, showAsDot: true } } },
    { field: "from_stop", meta: { width: "half", note: "Origin stop code." } },
    { field: "to_stop", meta: { width: "half", note: "Destination stop code." } },
    { field: "route_label", meta: { width: "full", readonly: true } },
    { field: "trip_type", meta: { width: "half", interface: "select-dropdown", options: { choices: [{ text: "Single", value: "single" }, { text: "Return", value: "return" }] } } },
    { field: "passengers", meta: { width: "half" } },
    { field: "amount", meta: { width: "half", readonly: true, note: "Total charged, in pence (server-computed)." } },
    { field: "currency", meta: { width: "half", readonly: true } },
    { field: "name", meta: { width: "half" } },
    { field: "email", meta: { width: "half" } },
    { field: "phone", meta: { width: "half" } },
    { field: "stripe_session_id", meta: { width: "half", readonly: true, note: "Stripe Checkout Session id (unique — webhook idempotency)." } },
    { field: "stripe_payment_intent", meta: { width: "half", readonly: true } },
    { field: "route_slug", meta: { hidden: true, note: "Legacy — superseded by from_stop/to_stop." } },
  ],
  pass_purchases: [
    { field: "reference", meta: { width: "half", readonly: true } },
    { field: "status", meta: { width: "half", interface: "select-dropdown", display: "labels", options: { choices: STATUS_CHOICES }, display_options: { choices: STATUS_CHOICES, showAsDot: true } } },
    { field: "item_description", meta: { width: "full", note: "What the customer lost." } },
    { field: "amount", meta: { width: "half", readonly: true, note: "Fee charged, in pence (incl. VAT)." } },
    { field: "school_route", meta: { width: "half", interface: "boolean" } },
    { field: "stripe_session_id", meta: { hidden: false, readonly: true } },
  ],
  services: [
    { field: "title", meta: { width: "half", note: "Homepage card heading." } },
    { field: "href", meta: { width: "half", note: "Internal link, beginning with /." } },
    { field: "blurb", meta: { width: "full", note: "Homepage card description." } },
    { field: "icon", meta: { width: "half", note: "Icon key used when no image is selected." } },
    { field: "image", meta: { width: "half", note: "Homepage service-card photo. Replace this file to update the site." } },
    { field: "image_alt", meta: { width: "half", note: "Describe the image for screen readers and search engines." } },
  ],
  fleet: [
    { field: "name", meta: { width: "half" } },
    { field: "slug", meta: { width: "half", note: "URL identifier. Avoid changing after publication." } },
    { field: "seats", meta: { width: "half" } },
    { field: "group_label", meta: { width: "half" } },
    { field: "summary", meta: { width: "full" } },
    { field: "features", meta: { width: "full", note: "JSON list of customer-facing features." } },
    { field: "image", meta: { width: "half", note: "Main fleet card and full hero background image." } },
    { field: "image_alt", meta: { width: "half", note: "Accessible description of the main coach photo." } },
    { field: "gallery", meta: { width: "full", note: "JSON list of Directus file IDs for the gallery." } },
    { field: "layout_images", meta: { width: "full", note: "JSON list of seating-plan file IDs." } },
    { field: "seo_title", meta: { width: "full" } },
    { field: "seo_description", meta: { width: "full" } },
  ],
  pages: [
    { field: "title", meta: { width: "half" } },
    { field: "slug", meta: { width: "half", note: "URL identifier. Avoid changing after publication." } },
    { field: "subtitle", meta: { width: "full", note: "Hero introduction." } },
    { field: "body", meta: { width: "full", note: "Main page copy." } },
    { field: "image", meta: { width: "half", note: "Full hero background image (not a separate card)." } },
    { field: "image_alt", meta: { width: "half", note: "Accessible description of the hero image." } },
    { field: "attachments", meta: { width: "full", note: "JSON list of downloadable files and labels." } },
    { field: "seo_title", meta: { width: "full" } },
    { field: "seo_description", meta: { width: "full" } },
  ],
  tours: [
    { field: "destination", meta: { width: "half" } },
    { field: "slug", meta: { width: "half", note: "URL identifier. Avoid changing after publication." } },
    { field: "summary", meta: { width: "full" } },
    { field: "body", meta: { width: "full" } },
    { field: "image", meta: { width: "half", note: "Legacy fallback image." } },
    { field: "image_alt", meta: { width: "half" } },
    { field: "hero_image", meta: { width: "half", note: "Full-width destination hero background." } },
    { field: "hero_image_alt", meta: { width: "half" } },
    { field: "card_image", meta: { width: "half", note: "UK Tours listing-card photo." } },
    { field: "card_image_alt", meta: { width: "half" } },
    { field: "seo_title", meta: { width: "full" } },
    { field: "seo_description", meta: { width: "full" } },
  ],
  blog_posts: [
    { field: "title", meta: { width: "half" } },
    { field: "slug", meta: { width: "half", note: "URL identifier. Avoid changing after publication." } },
    { field: "excerpt", meta: { width: "full" } },
    { field: "author", meta: { width: "half" } },
    { field: "date", meta: { width: "half" } },
    { field: "body", meta: { width: "full" } },
    { field: "thumbnail", meta: { width: "half", note: "Blog card and article hero background." } },
    { field: "seo_title", meta: { width: "full" } },
    { field: "seo_description", meta: { width: "full" } },
  ],
  routes: [
    { field: "from", meta: { width: "half" } },
    { field: "to", meta: { width: "half" } },
    { field: "days", meta: { width: "half", note: "e.g. '7 days a week' or 'Friday to Monday only'." } },
    { field: "price_single", meta: { width: "half", note: "Single fare in pence (e.g. 1500 = £15.00). NOTE: per-leg booking uses settings.pricing fares." } },
    { field: "price_return", meta: { width: "half", note: "Return fare in pence." } },
    { field: "summary", meta: { width: "full", note: "Hero and route-list description." } },
    { field: "image", meta: { width: "half", note: "Full route hero background image." } },
    { field: "image_alt", meta: { width: "half", note: "Accessible description of the route image." } },
    { field: "stops", meta: { width: "full", note: "Timetable rows: time / place / detail." } },
    { field: "seo_title", meta: { width: "full" } },
    { field: "seo_description", meta: { width: "full" } },
  ],
  stops: [
    { field: "code", meta: { width: "half", note: "Stable code used by the booking form (don't change once live)." } },
    { field: "name", meta: { width: "half" } },
    { field: "detail", meta: { width: "full", note: "Full address shown to customers." } },
  ],
  school_routes: [
    { field: "school", meta: { width: "half", note: "School slug: pioneer-secondary-academy or herschel-grammar-school." } },
    { field: "code", meta: { width: "half", note: "Route code shown to parents (e.g. PSA Burnham, HGS XR1)." } },
    { field: "name", meta: { width: "full" } },
    { field: "return_note", meta: { width: "full", note: "Afternoon/return note shown under the timetable." } },
    { field: "stops", meta: { width: "full", note: "Morning pickups: [{ time, place }]." } },
  ],
  contact_submissions: [
    { field: "message", meta: { width: "full" } },
    { field: "created_at", meta: { width: "half", readonly: true } },
  ],
  settings: [
    { field: "name", meta: { width: "half" } },
    { field: "legal_name", meta: { width: "half" } },
    { field: "tagline", meta: { width: "full" } },
    { field: "subtitle", meta: { width: "full" } },
    { field: "description", meta: { width: "full" } },
    { field: "phone_display", meta: { width: "half" } },
    { field: "phone_href", meta: { width: "half" } },
    { field: "phone_hours", meta: { width: "full" } },
    { field: "email_general", meta: { width: "half" } },
    { field: "email_bookings", meta: { width: "half" } },
    { field: "pricing", meta: { width: "full", note: "Fees in pence; VAT rates as whole %. dailyExpressSingle/Return are the flat corridor fares." } },
    { field: "homepage", meta: { width: "full", interface: "input-code", options: { language: "json" }, note: "All homepage headings, paragraphs, buttons and feature labels. Saved changes appear on the site within about 5 seconds." } },
    { field: "fleet_page", meta: { width: "full", interface: "input-code", options: { language: "json" }, note: "Fleet listing and shared fleet-page copy." } },
    { field: "tour_page", meta: { width: "full", interface: "input-code", options: { language: "json" }, note: "UK Tours shared copy and amenities." } },
    { field: "nav", meta: { width: "full", note: "Main navigation links." } },
    { field: "footer_columns", meta: { width: "full", note: "Footer headings and links." } },
    { field: "social_links", meta: { width: "full", note: "Social account labels and URLs." } },
    { field: "faqs", meta: { width: "full", note: "Homepage and FAQ-page questions and answers." } },
    { field: "hero_image", meta: { width: "half", note: "Homepage hero fallback/poster image." } },
    { field: "hero_image_alt", meta: { width: "half", note: "Accessible description of the homepage hero image." } },
    { field: "hero_video", meta: { width: "full", note: "Optional muted looping homepage MP4. Remove it to use only the hero image." } },
    { field: "school_image", meta: { width: "half", note: "Homepage school-transport section photo." } },
    { field: "school_image_alt", meta: { width: "half" } },
    { field: "home_to_school_image", meta: { width: "half", note: "Home-to-school page hero background." } },
    { field: "home_to_school_image_alt", meta: { width: "half" } },
    { field: "daily_express_image", meta: { width: "half", note: "Daily Express page hero background." } },
    { field: "daily_express_image_alt", meta: { width: "half" } },
    { field: "accreditation_logos", meta: { width: "full", note: "Accreditation label to Directus file ID mapping." } },
    { field: "email_templates", meta: { width: "full", interface: "input-code", options: { language: "json" }, note: "Customer and staff transactional email copy. Keep all {{variable}} placeholders intact." } },
    { field: "client_media_revision", meta: { hidden: true, readonly: true, note: "Internal deployment marker; editors should not change it." } },
  ],
};

async function applyFieldMeta(collection, fields) {
  const existing = new Set((await api(`/fields/${collection}`)).map((f) => f.field));
  for (const f of fields) {
    if (!existing.has(f.field)) continue;
    await api(`/fields/${collection}/${f.field}`, { method: "PATCH", body: JSON.stringify({ meta: f.meta }) });
  }
  console.log(`✓ ${collection}: field UX applied`);
}

// ---- Insights dashboard ----
// A rich, plain-English board for a non-technical admin: revenue + counts across
// today / 7-day / all-time, an "abandoned cart" row (checkouts started but never
// paid) with the money left on the table, conversion, and recent-activity lists.
//
// Directus relative-date filters ($NOW) drive the time windows; "abandoned" = a row
// still `pending` more than 30 minutes after it was created (the webhook flips real
// payments to `paid` within seconds, so anything older is abandoned).
async function ensureDashboard() {
  const dashboards = await api("/dashboards?limit=-1");
  let dash = dashboards.find((d) => d.name === "NP Coaches");
  if (!dash) {
    dash = await api("/dashboards", {
      method: "POST",
      body: JSON.stringify({ name: "NP Coaches", icon: "insights", note: "Revenue, bookings, abandoned carts and leads at a glance" }),
    });
    console.log("✓ created dashboard 'NP Coaches'");
  } else {
    console.log("• dashboard 'NP Coaches' exists");
  }

  // The dashboard is client-owned after first creation. Never delete/recreate its
  // panels during a Git deployment, because that resets staff layout/customisation.
  const existing = await api(`/panels?filter[dashboard][_eq]=${dash.id}&limit=-1`);
  if (existing.length) {
    console.log(`• dashboard panels already present (${existing.length}) — preserved`);
    return;
  }

  const PAID = { status: { _eq: "paid" } };
  // Abandoned = still pending & created > 30 min ago (real payments flip to paid in seconds).
  const ABANDONED = { _and: [{ status: { _eq: "pending" } }, { created_at: { _lte: "$NOW(-30 minutes)" } }] };
  const since = (window) => ({ created_at: { _gte: window } });

  const panels = [];
  const add = (p) => panels.push({ dashboard: dash.id, ...p });

  // Small helpers to keep the grid readable. Directus dashboards are 24 columns wide.
  const metric = (name, opts, x, y, { w = 6, h = 5, note, color } = {}) =>
    add({ name, note, type: "metric", position_x: x, position_y: y, width: w, height: h, options: { sortField: "id", ...opts }, ...(color ? { color } : {}) });
  const count = (collection, filter) => ({ collection, field: "id", function: "count", filter });
  const sum = (collection, field, filter) => ({ collection, field, function: "sum", filter });
  const list = (name, collection, opts, x, y, { w = 8, h = 9, note } = {}) =>
    add({ name, note, type: "list", position_x: x, position_y: y, width: w, height: h, options: { limit: 6, sortField: "-created_at", ...opts } });

  // Row 1 — headline revenue (in pence; the admin note explains ÷100 = £).
  metric("Revenue today (pence)", sum("bookings", "amount", { _and: [PAID, since("$NOW(-1 day)")] }), 0, 0, { w: 6, note: "Paid bookings in the last 24h. ÷100 for £.", color: "#16a34a" });
  metric("Revenue — 7 days (pence)", sum("bookings", "amount", { _and: [PAID, since("$NOW(-7 days)")] }), 6, 0, { w: 6, note: "÷100 for £.", color: "#16a34a" });
  metric("Revenue — 30 days (pence)", sum("bookings", "amount", { _and: [PAID, since("$NOW(-30 days)")] }), 12, 0, { w: 6, note: "÷100 for £.", color: "#16a34a" });
  metric("Revenue — all time (pence)", sum("bookings", "amount", PAID), 18, 0, { w: 6, note: "÷100 for £.", color: "#16a34a" });

  // Row 2 — booking volume by window + pass revenue.
  metric("Paid bookings today", count("bookings", { _and: [PAID, since("$NOW(-1 day)")] }), 0, 5, { w: 6 });
  metric("Paid bookings — 7 days", count("bookings", { _and: [PAID, since("$NOW(-7 days)")] }), 6, 5, { w: 6 });
  metric("Paid bookings — all time", count("bookings", PAID), 12, 5, { w: 6 });
  metric("Lost-property pass revenue (pence)", sum("pass_purchases", "amount", PAID), 18, 5, { w: 6, note: "÷100 for £.", color: "#16a34a" });

  // Row 3 — ABANDONED CARTS (started checkout, never paid) + money left on the table.
  metric("🛒 Abandoned bookings", count("bookings", ABANDONED), 0, 10, { w: 6, note: "Started checkout but never paid (>30 min). Follow up if you have their details.", color: "#d97706" });
  metric("Abandoned value (pence)", sum("bookings", "amount", ABANDONED), 6, 10, { w: 6, note: "Potential revenue lost to abandoned booking carts. ÷100 for £.", color: "#dc2626" });
  metric("Abandoned pass purchases", count("pass_purchases", ABANDONED), 12, 10, { w: 6, note: "Lost-property checkouts started but not paid.", color: "#d97706" });
  metric("New leads — 7 days", count("contact_submissions", since("$NOW(-7 days)")), 18, 10, { w: 6, note: "Contact + quote form messages this week.", color: "#2563eb" });

  // Row 4 — recent activity lists.
  list("Recent paid bookings", "bookings", { filter: PAID, displayTemplate: "{{reference}} · {{route_label}} · {{name}}" }, 0, 15, { w: 8, note: "Newest paid Daily Express tickets." });
  list("🛒 Recent abandoned carts", "bookings", { filter: ABANDONED, displayTemplate: "{{reference}} · {{route_label}} · {{name}} · {{email}}" }, 8, 15, { w: 8, note: "Follow-up candidates — they left without paying." });
  list("Recent messages / quote requests", "contact_submissions", { displayTemplate: "{{name}} — {{subject}}" }, 16, 15, { w: 8, note: "Reply within 24h." });

  for (const p of panels) await api("/panels", { method: "POST", body: JSON.stringify(p) });
  console.log(`✓ dashboard panels set (${panels.length})`);
}

async function run() {
  console.log(`Configuring Directus admin at ${BASE} ...`);
  if (!directus.hasToken()) {
    directus.setToken(
      (await api("/auth/login", { method: "POST", body: JSON.stringify({ email: EMAIL, password: PASSWORD }) })).access_token,
    );
  }

  const existing = new Set((await api("/collections?limit=-1")).map((c) => c.collection));
  for (const g of GROUPS) await ensureGroup(g, existing);

  for (const [collection, meta] of Object.entries(COLLECTION_META)) {
    if (!existing.has(collection)) continue;
    await applyCollectionMeta(collection, meta);
  }

  for (const [collection, fields] of Object.entries(FIELD_META)) {
    if (!existing.has(collection)) continue;
    await applyFieldMeta(collection, fields);
  }

  await ensureDashboard();

  console.log("Done. Refresh the Directus admin to see groups, templates and the dashboard.");
}

run().catch((err) => {
  console.error("Configure failed:", err.message);
  process.exit(1);
});
