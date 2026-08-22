/**
 * Canonical public origin for links, Stripe redirects, QR codes and structured data.
 * Runtime environment wins so the same CMS data can serve demo, www and apex hosts.
 */
export function siteUrl(cmsUrl?: string): string {
  const candidates = [process.env.SITE_URL, process.env.NEXT_PUBLIC_SITE_URL, cmsUrl];
  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      const url = new URL(candidate);
      if (url.protocol === "http:" || url.protocol === "https:") return url.origin;
    } catch {
      // Try the next configured source.
    }
  }
  throw new Error("SITE_URL or NEXT_PUBLIC_SITE_URL must be a valid absolute HTTP(S) URL");
}
