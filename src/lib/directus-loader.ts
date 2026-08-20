/**
 * Custom next/image loader for Directus-served media.
 *
 * Directus resizes on the fly via /assets/<id>?width=&quality=, so we let it do the
 * work and bypass Next's own optimizer. This keeps responsive `sizes` working and
 * sidesteps Next 16's private-IP block (the local Directus is on 127.0.0.1 in dev).
 * Non-Directus/local sources pass through unchanged.
 */
export default function directusLoader({
  src,
  width,
  quality,
}: {
  src: string;
  width: number;
  quality?: number;
}): string {
  if (!src.includes("/assets/")) return src; // not a Directus asset — return as-is
  const url = new URL(src);
  url.searchParams.set("width", String(Math.min(width, 2560)));
  url.searchParams.set("quality", String(quality ?? 78));
  url.searchParams.set("fit", "cover");
  url.searchParams.set("format", "webp");
  url.searchParams.set("withoutEnlargement", "true");
  return url.toString();
}
