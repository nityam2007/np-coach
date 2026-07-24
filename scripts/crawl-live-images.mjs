// Crawl the live WordPress site (np-coaches.co.uk) and download every content image
// into directus/seed-media/live/, deduplicated to ORIGINAL files (WordPress size
// variants like `-300x212` are stripped). Writes live/manifest.json (page → files).
//
// Run: node scripts/crawl-live-images.mjs   (idempotent — existing files are skipped)

import { mkdir, writeFile, access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, basename } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(HERE, "..", "directus", "seed-media", "live");
const SITE = "https://np-coaches.co.uk";

// Every known live page (root pages + fleet + routes + info + legal + school).
const PAGES = [
  "/", "/about-us/", "/contact-us/", "/faqs/", "/get-a-quote/", "/fleet/",
  "/uk-tours/", "/daily-express-service/", "/lost-property/", "/timetable/",
  "/home-to-school/", "/safeguarding/", "/vacancies/", "/downloads/",
  "/privacy-policy/", "/cookie-policy/",
  "/19-seat-coaches/", "/35-seat-coaches/", "/53-seat-coaches/",
  "/76-seat-coaches/", "/86-seat-coaches/", "/98-seat-coaches/",
  "/wolverhampton-to-london/", "/london-to-leicester/", "/leicester-to-london/",
];

const IMG_RE = /https:\/\/np-coaches\.co\.uk\/wp-content\/uploads\/[^"'<>\s)\\]+?\.(?:png|jpe?g|webp|svg|gif)/gi;

/** Strip WordPress resize suffix (`-800x600` before the extension) → original file URL. */
function originalUrl(url) {
  return url.replace(/-\d+x\d+(\.(?:png|jpe?g|webp|svg|gif))$/i, "$1");
}

async function exists(path) {
  try { await access(path); return true; } catch { return false; }
}

async function run() {
  await mkdir(OUT_DIR, { recursive: true });
  const manifest = {}; // page → [filenames]
  const all = new Map(); // filename → url

  for (const page of PAGES) {
    try {
      const res = await fetch(`${SITE}${page}`, { redirect: "follow" });
      if (!res.ok) { console.log(`• skip ${page} (${res.status})`); continue; }
      const html = await res.text();
      const urls = [...new Set([...html.matchAll(IMG_RE)].map((m) => originalUrl(m[0])))];
      const files = [];
      for (const url of urls) {
        const name = decodeURIComponent(basename(new URL(url).pathname));
        files.push(name);
        if (!all.has(name)) all.set(name, url);
      }
      manifest[page] = files.sort();
      console.log(`✓ ${page} — ${files.length} images`);
    } catch (err) {
      console.log(`• skip ${page} (${err.message})`);
    }
  }

  let downloaded = 0, skipped = 0, failed = 0;
  for (const [name, url] of all) {
    const dest = join(OUT_DIR, name);
    if (await exists(dest)) { skipped++; continue; }
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await writeFile(dest, Buffer.from(await res.arrayBuffer()));
      downloaded++;
    } catch (err) {
      console.log(`✗ ${name}: ${err.message}`);
      failed++;
    }
  }

  await writeFile(join(OUT_DIR, "manifest.json"), JSON.stringify(manifest, null, 2));
  console.log(`\nDone. ${all.size} unique originals — ${downloaded} downloaded, ${skipped} already present, ${failed} failed.`);
}

run().catch((err) => { console.error(err); process.exit(1); });
