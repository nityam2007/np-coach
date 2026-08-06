// Upload the seed media (from directus/seed-media/) into Directus files, idempotently,
// then attach the file ids to fleet vehicles, tours and the home-to-school schools.
// Grants public read on directus_files so /assets/<id> works for the website.
//
// Run AFTER `npm run seed` (collections + rows must exist):
//   npm run media   (with Directus reachable)
//
// Idempotent: a file is matched by its `title`; existing files are reused, not duplicated.

import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, extname, basename } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const MEDIA_DIR = join(HERE, "..", "directus", "seed-media");

const BASE = process.env.DIRECTUS_URL ?? "http://localhost:8055";
const EMAIL = process.env.DIRECTUS_ADMIN_EMAIL ?? "admin@np-coaches.co.uk";
const PASSWORD = process.env.DIRECTUS_ADMIN_PASSWORD ?? "change-me";
const STATIC_TOKEN = process.env.DIRECTUS_ADMIN_TOKEN;
const REQUEST_INTERVAL_MS = 25;
const MAX_RATE_LIMIT_RETRIES = 8;

let token = STATIC_TOKEN ?? null;
let nextRequestAt = 0;

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function paceRequest() {
  const delay = nextRequestAt - Date.now();
  if (delay > 0) await wait(delay);
  nextRequestAt = Date.now() + REQUEST_INTERVAL_MS;
}

function retryDelay(response, message, attempt) {
  const retryAfter = response.headers.get("retry-after");
  let headerDelay = 0;
  if (retryAfter) {
    const seconds = Number(retryAfter);
    headerDelay = Number.isFinite(seconds) ? seconds * 1_000 : Math.max(0, Date.parse(retryAfter) - Date.now());
  }

  const match = message.match(/retry after\s+([\d.]+)\s*(ms|s|seconds?)/i);
  const messageDelay = match ? Number(match[1]) * (match[2].toLowerCase() === "ms" ? 1 : 1_000) : 0;
  const backoff = 250 * 2 ** attempt;
  return Math.min(60_000, Math.ceil(Math.max(headerDelay, messageDelay, backoff) + 100));
}

async function api(path, options = {}, attempt = 0) {
  // Default to JSON content-type for string bodies; never set it for FormData (undici
  // must add its own multipart boundary).
  const isForm = options.body instanceof FormData;
  await paceRequest();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(typeof options.body === "string" && !isForm ? { "Content-Type": "application/json" } : {}),
      ...(options.headers ?? {}),
    },
  });
  const txt = await res.text();
  let json = {};
  try {
    json = txt ? JSON.parse(txt) : {};
  } catch {
    // Keep the raw response available for the error below.
  }
  if (!res.ok) {
    const message = json?.errors?.[0]?.message ?? txt;
    if (res.status === 429 && attempt < MAX_RATE_LIMIT_RETRIES) {
      const delay = retryDelay(res, message, attempt);
      console.warn(`Rate limited on ${options.method ?? "GET"} ${path}; retrying in ${delay}ms (${attempt + 1}/${MAX_RATE_LIMIT_RETRIES})`);
      await wait(delay);
      return api(path, options, attempt + 1);
    }
    throw Object.assign(new Error(`${options.method ?? "GET"} ${path} → ${res.status}: ${message}`), { status: res.status });
  }
  return json.data;
}

const MIME = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp" };

// Upload one file if a file with this title doesn't already exist. Returns the file id.
// `dir` is the source directory; `folderId` files it under a Directus folder.
async function ensureFile(filename, dir = MEDIA_DIR, folderId = null) {
  const title = basename(filename, extname(filename));
  const existing = await api(`/files?filter[title][_eq]=${encodeURIComponent(title)}&limit=1`);
  if (existing.length) return existing[0].id;

  const buf = await readFile(join(dir, filename));
  const form = new FormData();
  form.append("title", title);
  if (folderId) form.append("folder", folderId);
  form.append("file", new Blob([buf], { type: MIME[extname(filename).toLowerCase()] ?? "application/octet-stream" }), filename);

  const created = await api("/files", { method: "POST", body: form });
  console.log(`✓ uploaded ${filename} → ${created.id}`);
  return created.id;
}

// Directus media folder, created once, matched by name.
async function ensureFolder(name) {
  const existing = await api(`/folders?filter[name][_eq]=${encodeURIComponent(name)}&limit=1`);
  if (existing.length) return existing[0].id;
  const created = await api("/folders", { method: "POST", body: JSON.stringify({ name }) });
  console.log(`✓ created media folder "${name}"`);
  return created.id;
}

// Map of fleet slug → exterior image filename.
const FLEET_IMAGES = {
  "19-seat-coaches": "fleet-19-seat.png",
  "35-seat-coaches": "fleet-35-seat.jpg",
  "53-seat-coaches": "fleet-53-seat.jpg",
  "72-seat-coaches": "fleet-72-seat.jpg",
  "86-seat-coaches": "fleet-86-seat.png",
  "98-seat-coaches": "fleet-98-seat.png",
};
// 19-seat detail gallery (interiors + layout).
const FLEET_GALLERY = {
  "19-seat-coaches": ["fleet-19-int1.jpeg", "fleet-19-int2.jpeg", "fleet-19-int3.jpeg", "fleet-19-layout.png"],
};
// Tour slug → hero image.
// Original WordPress fleet media, grouped by the page it came from.
const FLEET_LIVE_GALLERIES = {
  "19-seat-coaches": ["DSC01441-scaled.jpeg", "DSC01486-scaled.jpeg", "DSC01493-scaled.jpeg", "DSC01544-scaled.jpeg", "DSC01548-scaled.jpeg", "DSC01556-scaled.jpeg"],
  "35-seat-coaches": ["DSC01957-1-scaled.jpeg", "DSC01975-scaled.jpeg", "DSC01997-1-scaled.jpeg", "DSC02027-scaled.jpeg", "DSC02034-scaled.jpeg"],
  "53-seat-coaches": ["DSC00069-1-scaled.jpg", "DSC00077-scaled.jpg", "DSC00079-scaled.jpg", "DSC00081-scaled.jpg", "DSC00082-scaled.jpg", "DSC00085-scaled.jpg"],
  "72-seat-coaches": ["DSC01866-1-scaled.jpeg", "DSC01881-scaled.jpeg", "DSC01886-scaled.jpeg", "DSC01901-scaled.jpeg", "DSC01904-scaled.jpeg"],
  "86-seat-coaches": ["DSC01667-scaled.jpeg", "DSC01674-1-scaled.jpeg", "DSC01768-scaled.jpeg", "DSC01780-scaled.jpeg", "DSC01793-scaled.jpeg", "DSC01830-scaled.jpeg"],
  "98-seat-coaches": ["9-scaled.jpg", "11-scaled.jpg", "16-scaled.jpg", "19-scaled.jpg", "24-scaled.jpg", "31-scaled.jpg", "38-scaled.jpg"],
};
const FLEET_LAYOUTS = {
  "19-seat-coaches": ["19-seater-layout.png"],
  "35-seat-coaches": ["35-seater-layout.png"],
  "53-seat-coaches": ["53-seater-layout.png"],
  "72-seat-coaches": ["72-seater-layout.png"],
  "86-seat-coaches": ["86-seater-layout-lower-floor.png", "86-seater-layout-upper-floor.png"],
  "98-seat-coaches": ["98-seater-layout-lower-floor.png", "98-seater-layout-upper-floor.png"],
};
const PAGE_IMAGES = {
  "about-us": "DSC09651.jpg",
  "lost-property": "download.jpeg",
  safeguarding: "Safeguarding-artwork-1.jpg",
  timetable: "0001-1-1448x2048-1.jpg",
};
const BLOG_IMAGES = {
  "choosing-the-right-coach-size": "DSC09341-3.jpg",
  "what-ulez-compliant-means": "DSC09057.jpg",
};

const TOUR_IMAGES = {
  london: "tour-london-thames.jpeg",
  windsor: "tour-touring-coach.jpg",
  "hampton-court": "tour-touristic-buses.jpg",
  cornwall: "tour-london-thames.jpeg",
  salisbury: "tour-touring-coach.jpg",
  bath: "tour-touristic-buses.jpg",
  "john-wesley": "tour-touring-coach.jpg",
};

async function ensurePublicReadFiles() {
  const policies = await api("/policies?limit=-1");
  const publicPolicy = policies.find((p) => p.name === "$t:public_label");
  if (!publicPolicy) throw new Error("public policy not found");
  const existing = await api(
    `/permissions?filter[policy][_eq]=${publicPolicy.id}&filter[collection][_eq]=directus_files&filter[action][_eq]=read&limit=1`,
  );
  if (existing.length) {
    console.log("• public read on files already granted");
    return;
  }
  await api("/permissions", {
    method: "POST",
    body: JSON.stringify({ policy: publicPolicy.id, collection: "directus_files", action: "read", fields: ["*"], permissions: {}, validation: {} }),
  });
  console.log("✓ granted public read on files (/assets/<id> now works)");
}

async function setItemImage(collection, slug, field, value) {
  const rows = await api(`/items/${collection}?filter[slug][_eq]=${encodeURIComponent(slug)}&fields=id,${field}&limit=1`);
  const row = rows[0];
  if (!row) return;
  if (row[field]) return; // don't overwrite a client-set image
  await api(`/items/${collection}/${row.id}`, { method: "PATCH", body: JSON.stringify({ [field]: value }) });
  console.log(`✓ ${collection}/${slug}.${field} set`);
}

async function run() {
  console.log(`Uploading media to ${BASE} ...`);
  if (!token) {
    token = (
      await api("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
      })
    ).access_token;
  }

  const files = (await readdir(MEDIA_DIR, { withFileTypes: true }))
    .filter((e) => e.isFile() && MIME[extname(e.name).toLowerCase()])
    .map((e) => e.name);
  const ids = {};
  for (const f of files) ids[f] = await ensureFile(f);

  await ensurePublicReadFiles();

  // Fleet exterior images + galleries.
  for (const [slug, file] of Object.entries(FLEET_IMAGES)) await setItemImage("fleet", slug, "image", ids[file]);
  for (const [slug, gallery] of Object.entries(FLEET_GALLERY)) {
    await setItemImage("fleet", slug, "gallery", gallery.map((g) => ids[g]).filter(Boolean));
  }
  // Tour hero images.
  for (const [slug, file] of Object.entries(TOUR_IMAGES)) await setItemImage("tours", slug, "image", ids[file]);

  // School logos go on settings.school_transport as { logos: { <slug>: <fileId> } }.
  // The schools list/config itself lives in site-content.json; we only manage logos here.
  await api("/items/settings", {
    method: "PATCH",
    body: JSON.stringify({
      school_transport: {
        logos: {
          "pioneer-secondary-academy": ids["school-psa.jpg"],
          "herschel-grammar-school": ids["school-herschel.png"],
        },
      },
    }),
  });
  console.log("✓ set settings.school_transport logos (by slug)");

  // Full live-site image archive (from scripts/crawl-live-images.mjs) → its own folder,
  // so the client can reuse any original WordPress image from the media library.
  const liveDir = join(MEDIA_DIR, "live");
  let liveFiles = [];
  try {
    liveFiles = (await readdir(liveDir, { withFileTypes: true }))
      .filter((e) => e.isFile() && MIME[extname(e.name).toLowerCase()])
      .map((e) => e.name);
  } catch {
    console.log("• no live/ archive found — run `node scripts/crawl-live-images.mjs` first");
  }
  const liveIds = {};
  if (liveFiles.length) {
    const folder = await ensureFolder("Live site archive");
    for (const f of liveFiles) liveIds[f] = await ensureFile(f, liveDir, folder);
    console.log(`✓ live archive: ${liveFiles.length} files in Directus`);
  }

  // Attach archived detail media only when the CMS field is still empty. Editors can
  // replace any of these files later and repeated media runs never overwrite them.
  for (const [slug, gallery] of Object.entries(FLEET_LIVE_GALLERIES)) {
    await setItemImage("fleet", slug, "gallery", gallery.map((file) => liveIds[file]).filter(Boolean));
  }
  for (const [slug, layouts] of Object.entries(FLEET_LAYOUTS)) {
    await setItemImage("fleet", slug, "layout_images", layouts.map((file) => liveIds[file]).filter(Boolean));
  }
  for (const [slug, file] of Object.entries(PAGE_IMAGES)) {
    if (liveIds[file]) await setItemImage("pages", slug, "image", liveIds[file]);
  }
  for (const [slug, file] of Object.entries(BLOG_IMAGES)) {
    if (liveIds[file]) await setItemImage("blog_posts", slug, "thumbnail", liveIds[file]);
  }

  // Brand assets on settings (only if unset — client edits win): the crisp NPC globe
  // logo, the flagship-coach hero photo, the school-transport block photo, and the real
  // accreditation badge images.
  const current = await api("/items/settings?fields=logo,hero_image,school_image,accreditation_logos");
  const patch = {};
  if (!current.logo && liveIds["io.png"]) patch.logo = liveIds["io.png"];
  if (!current.hero_image && liveIds["DSC09341-3.jpg"]) patch.hero_image = liveIds["DSC09341-3.jpg"];
  if (!current.school_image && liveIds["DSC01183.jpg"]) patch.school_image = liveIds["DSC01183.jpg"];
  const ACCRED_LOGOS = {
    "CPT Member": "b1bdf067-dfb2-4be7-85b3-cd1ac265506e.png",
    UKCOA: "bb3b73ba-621c-4681-be53-375a0266510d.jpeg",
    "Coach Tourism Association": "1302b53b-c696-4c55-9b62-d06d38b08d33.jpeg",
    "Disability Confident": "0ec64825-d2a0-4adb-809d-d73324ea6f7c.png",
    WeLoveCoaches: "8d5a300e-1f8b-4ca8-8ff0-bf231844d397.jpeg",
    "Transport for Buckinghamshire": "677513a8-c81a-4cd6-9ba0-34d58699eaa0.png",
  };
  if (!current.accreditation_logos || Object.keys(current.accreditation_logos).length === 0) {
    const logos = {};
    for (const [name, file] of Object.entries(ACCRED_LOGOS)) if (liveIds[file]) logos[name] = liveIds[file];
    if (Object.keys(logos).length) patch.accreditation_logos = logos;
  }
  if (Object.keys(patch).length) {
    await api("/items/settings", { method: "PATCH", body: JSON.stringify(patch) });
    console.log(`✓ settings brand assets set: ${Object.keys(patch).join(", ")}`);
  } else {
    console.log("• settings logo/hero/badges already set — skipped");
  }

  // Homepage service-card photos (matched by title; only set when empty).
  const SERVICE_IMAGES = {
    "School Transport": liveIds["DSC01183.jpg"],
    "Corporate Travel": ids["fleet-53-seat.jpg"],
    "UK Tours": liveIds["istockphoto-1158487343-612x612-1.jpeg"],
    "Private Hire": liveIds["DSC09057.jpg"],
  };
  for (const [title, fileId] of Object.entries(SERVICE_IMAGES)) {
    if (!fileId) continue;
    const rows = await api(`/items/services?filter[title][_eq]=${encodeURIComponent(title)}&fields=id,image&limit=1`);
    if (rows[0] && !rows[0].image) {
      await api(`/items/services/${rows[0].id}`, { method: "PATCH", body: JSON.stringify({ image: fileId }) });
      console.log(`✓ services/${title}.image set`);
    }
  }

  console.log("Done. Media uploaded and linked.");
}

run().catch((err) => {
  console.error("Media upload failed:", err.message);
  process.exit(1);
});
