import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site-config";
import { getFleet, getPages, getTours, getRoutes, getBlogPosts, getSettings } from "@/lib/directus";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteConfig.url;
  const [fleet, pages, tours, routes, posts, settings] = await Promise.all([
    getFleet(),
    getPages(),
    getTours(),
    getRoutes(),
    getBlogPosts(),
    getSettings(),
  ]);

  return [
    { url: `${base}/`, priority: 1 },
    { url: `${base}/fleet`, priority: 0.8 },
    { url: `${base}/uk-tours`, priority: 0.8 },
    { url: `${base}/daily-express-service`, priority: 0.8 },
    { url: `${base}/daily-express-service/book`, priority: 0.6 },
    { url: `${base}/lost-property/claim`, priority: 0.4 },
    { url: `${base}/home-to-school`, priority: 0.8 },
    { url: `${base}/contact-us`, priority: 0.6 },
    { url: `${base}/get-a-quote`, priority: 0.7 },
    { url: `${base}/blog`, priority: 0.6 },
    ...fleet.map((vehicle) => ({ url: `${base}/${vehicle.slug}`, priority: 0.7 })),
    ...pages.map((page) => ({ url: `${base}/${page.slug}`, priority: 0.6 })),
    ...tours.map((tour) => ({ url: `${base}/uk-tours/${tour.slug}`, priority: 0.7 })),
    ...routes.map((route) => ({ url: `${base}/${route.slug}`, priority: 0.7 })),
    ...settings.schoolTransport.schools.map((s) => ({ url: `${base}/home-to-school/${s.slug}`, priority: 0.6 })),
    ...posts.map((post) => ({ url: `${base}/blog/${post.slug}`, priority: 0.5, lastModified: post.date })),
  ];
}
