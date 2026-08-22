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
import { createDirectusApi } from "./directus-api.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const MEDIA_DIR = join(HERE, "..", "directus", "seed-media");
const CLIENT_MEDIA_DIR = join(MEDIA_DIR, "client-2026-08");
const CLIENT_MEDIA_REVISION = "client-review-2026-08-20-v2";
const siteContent = JSON.parse(await readFile(join(HERE, "..", "src", "lib", "site-content.json"), "utf8"));

const BASE = process.env.DIRECTUS_URL ?? "http://localhost:8055";
const EMAIL = process.env.DIRECTUS_ADMIN_EMAIL ?? "admin@np-coaches.co.uk";
const PASSWORD = process.env.DIRECTUS_ADMIN_PASSWORD ?? "change-me";
const STATIC_TOKEN = process.env.DIRECTUS_ADMIN_TOKEN;
const directus = createDirectusApi({ base: BASE, token: STATIC_TOKEN });
const api = directus.request;

const MIME = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".mp4": "video/mp4", ".pdf": "application/pdf" };

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

const CLIENT_TOUR_IMAGES = Object.fromEntries(
  ["london", "windsor", "hampton-court", "cornwall", "salisbury", "bath", "john-wesley"].map((slug) => [
    slug,
    { hero: `tour-${slug}-hero.jpg`, card: `tour-${slug}-card.png` },
  ]),
);
const CLIENT_ROUTE_IMAGES = {
  "wolverhampton-to-london": "wolverhampton-banner.jpg",
  "london-to-leicester": "london-leicester-banner.jpg",
  "leicester-to-london": "london-leicester-banner.jpg",
};
async function ensurePublicReadFiles() {
  const policies = await api("/policies?limit=-1");
  const publicPolicy = policies.find((p) => p.name === "$t:public_label");
  if (!publicPolicy) throw new Error("public policy not found");
  const existing = await api(
    `/permissions?filter[policy][_eq]=${publicPolicy.id}&filter[collection][_eq]=directus_files&filter[action][_eq]=read&limit=1`,
  );
  const permission = { fields: ["id", "title", "type", "width", "height", "description", "modified_on"], permissions: {}, validation: {} };
  if (existing.length) {
    await api(`/permissions/${existing[0].id}`, { method: "PATCH", body: JSON.stringify(permission) });
    console.log("✓ public file metadata restricted to display-safe fields");
    return;
  }
  await api("/permissions", {
    method: "POST",
    body: JSON.stringify({ policy: publicPolicy.id, collection: "directus_files", action: "read", ...permission }),
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
  if (!directus.hasToken()) {
    directus.setToken(
      (
        await api("/auth/login", {
          method: "POST",
          body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
        })
      ).access_token,
    );
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

  // Client-approved August 2026 review pack. Apply each revision once, then leave all
  // fields under Directus editor control on subsequent deploys.
  const reviewSettings = await api("/items/settings?fields=client_media_revision");
  if (reviewSettings.client_media_revision !== CLIENT_MEDIA_REVISION) {
    const clientFolder = await ensureFolder("Client supplied — August 2026");
    const clientFiles = (await readdir(CLIENT_MEDIA_DIR, { withFileTypes: true }))
      .filter((entry) => entry.isFile() && MIME[extname(entry.name).toLowerCase()])
      .map((entry) => entry.name);
    const clientIds = {};
    for (const file of clientFiles) clientIds[file] = await ensureFile(file, CLIENT_MEDIA_DIR, clientFolder);

    await api("/items/settings", {
      method: "PATCH",
      body: JSON.stringify({
        hero_video: clientIds["home-hero-video.mp4"],
        school_image: clientIds["home-to-school-blue-section.jpg"],
        school_image_alt: "NP Coaches school transport service coach",
        home_to_school_image: clientIds["home-to-school-banner.jpg"],
        home_to_school_image_alt: "NP Coaches home-to-school transport service",
        daily_express_image: clientIds["daily-express-banner.jpg"],
        daily_express_image_alt: "NP Coaches Daily Express coach service",
      }),
    });

    const clientServiceImages = {
      "School Transport": {
        file: "home-to-school-card.jpg",
        alt: "NP Coaches school transport service coach",
      },
      "UK Tours": {
        file: "tour-london-card.png",
        alt: siteContent.services.find((service) => service.title === "UK Tours")?.imageAlt ?? "NP Coaches UK coach tours",
      },
    };
    for (const [title, media] of Object.entries(clientServiceImages)) {
      const service = await api(`/items/services?filter[title][_eq]=${encodeURIComponent(title)}&fields=id&limit=1`);
      if (!service[0] || !clientIds[media.file]) continue;
      await api(`/items/services/${service[0].id}`, {
        method: "PATCH",
        body: JSON.stringify({ image: clientIds[media.file], image_alt: media.alt }),
      });
    }
    const lostProperty = await api("/items/pages?filter[slug][_eq]=lost-property&fields=id&limit=1");
    if (lostProperty[0]) {
      await api(`/items/pages/${lostProperty[0].id}`, {
        method: "PATCH",
        body: JSON.stringify({ image: clientIds["lost-property.png"], image_alt: "NP Coaches lost property assistance" }),
      });
    }

    const downloads = await api("/items/pages?filter[slug][_eq]=downloads&fields=id&limit=1");
    if (downloads[0]) {
      const attachment = siteContent.pages.find((page) => page.slug === "downloads")?.attachments?.[0];
      await api(`/items/pages/${downloads[0].id}`, {
        method: "PATCH",
        body: JSON.stringify({
          attachments: attachment ? [{ ...attachment, href: undefined, file: clientIds["compliance-pack-2025-2026.pdf"] }] : [],
        }),
      });
    }

    for (const [slug, files] of Object.entries(CLIENT_TOUR_IMAGES)) {
      const row = await api(`/items/tours?filter[slug][_eq]=${encodeURIComponent(slug)}&fields=id&limit=1`);
      const fallback = siteContent.tours.find((tour) => tour.slug === slug);
      if (row[0]) {
        await api(`/items/tours/${row[0].id}`, {
          method: "PATCH",
          body: JSON.stringify({
            hero_image: clientIds[files.hero],
            card_image: clientIds[files.card],
            image_alt: fallback?.imageAlt,
            hero_image_alt: fallback?.heroImageAlt,
            card_image_alt: fallback?.cardImageAlt,
          }),
        });
      }
    }

    for (const [slug, file] of Object.entries(CLIENT_ROUTE_IMAGES)) {
      const row = await api(`/items/routes?filter[slug][_eq]=${encodeURIComponent(slug)}&fields=id&limit=1`);
      const fallback = siteContent.routes.find((route) => route.slug === slug);
      if (row[0]) {
        await api(`/items/routes/${row[0].id}`, {
          method: "PATCH",
          body: JSON.stringify({ image: clientIds[file], image_alt: fallback?.imageAlt }),
        });
      }
    }

    await api("/items/settings", {
      method: "PATCH",
      body: JSON.stringify({ client_media_revision: CLIENT_MEDIA_REVISION }),
    });
    console.log(`✓ applied client media revision ${CLIENT_MEDIA_REVISION}`);
  } else {
    console.log(`• client media revision ${CLIENT_MEDIA_REVISION} already applied — CMS edits preserved`);
  }
  // Three reusable route-style heroes for any page whose own CMS image is empty.
  // Each slot is a real Directus file field; fill only empty slots so editor choices win.
  const fallbackFolder = await ensureFolder("Client supplied — August 2026");
  const fallbackDefinitions = [
    {
      imageField: "page_hero_fallback_image_1",
      altField: "page_hero_fallback_image_1_alt",
      file: "wolverhampton-banner.jpg",
      alt: siteContent.routes.find((route) => route.slug === "wolverhampton-to-london")?.imageAlt ?? siteContent.mediaAlt.dailyExpressBanner,
    },
    {
      imageField: "page_hero_fallback_image_2",
      altField: "page_hero_fallback_image_2_alt",
      file: "london-leicester-banner.jpg",
      alt: siteContent.routes.find((route) => route.slug === "london-to-leicester")?.imageAlt ?? siteContent.mediaAlt.dailyExpressBanner,
    },
    {
      imageField: "page_hero_fallback_image_3",
      altField: "page_hero_fallback_image_3_alt",
      file: "daily-express-banner.jpg",
      alt: siteContent.mediaAlt.dailyExpressBanner,
    },
  ];
  const fallbackFields = fallbackDefinitions.flatMap(({ imageField, altField }) => [imageField, altField]);
  const currentFallbacks = await api(`/items/settings?fields=${fallbackFields.join(",")}`);
  const fallbackPatch = {};
  for (const definition of fallbackDefinitions) {
    const fileId = await ensureFile(definition.file, CLIENT_MEDIA_DIR, fallbackFolder);
    if (!currentFallbacks[definition.imageField]) {
      fallbackPatch[definition.imageField] = fileId;
      fallbackPatch[definition.altField] = definition.alt;
    } else if (currentFallbacks[definition.imageField] === fileId && !currentFallbacks[definition.altField]) {
      fallbackPatch[definition.altField] = definition.alt;
    }
  }
  if (Object.keys(fallbackPatch).length) {
    await api("/items/settings", { method: "PATCH", body: JSON.stringify(fallbackPatch) });
    console.log(`✓ reusable page heroes set: ${Object.keys(fallbackPatch).join(", ")}`);
  } else {
    console.log("• reusable page hero slots already configured — CMS edits preserved");
  }

  console.log("Done. Media uploaded and linked.");
}

run().catch((err) => {
  console.error("Media upload failed:", err.message);
  process.exit(1);
});
