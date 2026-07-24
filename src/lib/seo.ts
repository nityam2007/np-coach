import type { Metadata } from "next";
import { siteConfig } from "@/lib/site-config";

/**
 * One place to build a page's <title>/description/canonical/OG so every page is
 * consistent. `path` is the canonical route (e.g. "/fleet"); `titleAbsolute`
 * bypasses the layout's "%s | NP Coaches" template when the title already reads
 * as a full SEO title.
 */
export function buildMetadata({
  title,
  description,
  path,
  titleAbsolute = false,
  noIndex = false,
}: {
  title: string;
  description: string;
  path: string;
  titleAbsolute?: boolean;
  noIndex?: boolean;
}): Metadata {
  const url = `${siteConfig.url}${path}`;
  return {
    title: titleAbsolute ? { absolute: title } : title,
    description,
    alternates: { canonical: path },
    openGraph: { title, description, url },
    twitter: { title, description },
    ...(noIndex ? { robots: { index: false, follow: false } } : {}),
  };
}
