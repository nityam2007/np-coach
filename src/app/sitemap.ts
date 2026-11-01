import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site-config";
import { getFleet, getPages, getTours, getRoutes, getBlogPosts, getSettings, getServiceAreas } from "@/lib/directus";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteConfig.url;
  const [fleet, pages, tours, routes, posts, settings, areas] = await Promise.all([
    getFleet(),
    getPages(),
    getTours(),
    getRoutes(),
    getBlogPosts(),
    getSettings(),
    getServiceAreas(),
  ]);

  // Indexable landing pages only — transactional forms (booking, lost-property claim) are left out,
  // and `priority` is omitted because Google ignores it.
  return [
    { url: `${base}/` },
    { url: `${base}/fleet` },
    { url: `${base}/uk-tours` },
    { url: `${base}/daily-express-service` },
    { url: `${base}/home-to-school` },
    { url: `${base}/contact-us` },
    { url: `${base}/get-a-quote` },
    { url: `${base}/blog` },
    ...fleet.map((vehicle) => ({ url: `${base}/${vehicle.slug}` })),
    ...pages.map((page) => ({ url: `${base}/${page.slug}` })),
    ...tours.map((tour) => ({ url: `${base}/uk-tours/${tour.slug}` })),
    ...routes.map((route) => ({ url: `${base}/${route.slug}` })),
    ...areas.map((area) => ({ url: `${base}/${area.slug}` })),
    ...settings.schoolTransport.schools.map((s) => ({ url: `${base}/home-to-school/${s.slug}` })),
    ...posts.map((post) => ({ url: `${base}/blog/${post.slug}`, lastModified: post.date })),
  ];
}
