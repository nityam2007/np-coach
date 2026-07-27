import {
  siteConfig,
  type NavLink,
  type FooterColumn,
  type ServiceCard,
  type Stat,
  type FleetVehicle,
  type Page,
  type Tour,
  type CoachRoute,
  type RouteStop,
  type BlogPost,
  type Faq,
  type Testimonial,
  type Pricing,
  type Stop,
  type SchoolTransport,
  type SchoolRoute,
  type HomepageContent,
  type FleetPageContent,
} from "./site-config";

/**
 * Server-side reads from Directus. Public collections, no auth needed.
 * Falls back to the seeded defaults (site-config) if Directus is unreachable,
 * so the site always renders. Uses Next ISR (revalidate + tags).
 */

const DIRECTUS_URL = process.env.DIRECTUS_URL ?? "http://localhost:8055";
// Browser-facing Directus URL — images are loaded by the client, so they must use the
// public host, not the internal docker hostname.
const PUBLIC_DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL ?? "http://localhost:8055";
const REVALIDATE_SECONDS = 30;

/**
 * Build a public asset URL for a Directus file id. Returns null when there's no image.
 * Returns the bare /assets/<id> URL — the next/image custom loader (directus-loader.ts)
 * appends Directus `width`/`quality` transform params for responsive sizes, so callers
 * don't pass sizes here. Directus does the resizing; Next's optimizer is bypassed (which
 * also avoids Next 16's private-IP block in local dev).
 */
type DirectusFileRef = string | { id?: string | null } | null | undefined;

export function assetUrl(file: DirectusFileRef): string | null {
  const id = typeof file === "string" ? file : file?.id;
  if (!id) return null;
  return `${PUBLIC_DIRECTUS_URL}/assets/${id}`;
}

/** Normalised settings shape consumed by the UI (mirrors site-content). */
export interface SiteSettings {
  name: string;
  legalName: string;
  tagline: string;
  subtitle: string;
  description: string;
  url: string;
  founded: number;
  pricing: Pricing;
  phone: { display: string; href: string; hours: string };
  email: { general: string; bookings: string };
  address: { line1: string; line2: string; city: string; county: string; postcode: string };
  nav: NavLink[];
  footerColumns: FooterColumn[];
  legalLinks: NavLink[];
  stats: Stat[];
  accreditations: string[];
  coverage: string[];
  faqs: Faq[];
  homepage: HomepageContent;
  fleetPage: FleetPageContent;
  schoolTransport: SchoolTransport;
  /** Accreditation name → Directus file id (badge image). */
  accreditationLogos: Record<string, string>;
  /** Directus file ids (null until set in the CMS). */
  logo: string | null;
  heroImage: string | null;
  /** Photo for the homepage school-transport block. */
  schoolImage: string | null;
}

/** Raw `settings` singleton row as stored in Directus (flat columns + JSON fields). */
interface SettingsRow {
  name: string;
  legal_name: string;
  tagline: string;
  subtitle: string;
  description: string;
  url: string;
  founded: number;
  pricing: Pricing;
  phone_display: string;
  phone_href: string;
  phone_hours: string;
  email_general: string;
  email_bookings: string;
  address_line1: string;
  address_line2: string;
  address_city: string;
  address_county: string;
  address_postcode: string;
  nav: NavLink[];
  footer_columns: FooterColumn[];
  legal_links: NavLink[];
  stats: Stat[];
  accreditations: string[];
  coverage: string[];
  faqs: Faq[];
  homepage: HomepageContent | null;
  fleet_page: FleetPageContent | null;
  school_transport: { logos?: Record<string, string> } | null;
  accreditation_logos: Record<string, string> | null;
  logo: string | null;
  hero_image: string | null;
  school_image: string | null;
}

interface ServiceRow {
  id: number;
  sort: number | null;
  title: string;
  blurb: string;
  href: string;
  icon: string | null;
  image: string | null;
}

/** Raw `fleet` row as stored in Directus. */
interface FleetRow {
  id: number;
  slug: string;
  name: string;
  seats: number;
  group_label: string | null;
  summary: string;
  features: string[];
  image: string | null;
  gallery: string[] | null;
  layout_images: string[] | null;
  seo_title: string;
  seo_description: string;
}

async function fetchData<T>(path: string, tag: string): Promise<T | null> {
  try {
    const res = await fetch(`${DIRECTUS_URL}${path}`, {
      next: { revalidate: REVALIDATE_SECONDS, tags: [tag] },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { data: T };
    return json.data;
  } catch {
    return null;
  }
}

const fallbackSettings: SiteSettings = {
  name: siteConfig.name,
  legalName: siteConfig.legalName,
  tagline: siteConfig.tagline,
  subtitle: siteConfig.subtitle,
  description: siteConfig.description,
  url: siteConfig.url,
  founded: siteConfig.founded,
  pricing: siteConfig.pricing,
  phone: siteConfig.phone,
  email: siteConfig.email,
  address: siteConfig.address,
  nav: siteConfig.nav,
  footerColumns: siteConfig.footerColumns,
  legalLinks: siteConfig.legalLinks,
  stats: siteConfig.stats,
  accreditations: siteConfig.accreditations,
  coverage: siteConfig.coverage,
  faqs: siteConfig.faqs,
  homepage: siteConfig.homepage,
  fleetPage: siteConfig.fleetPage,
  schoolTransport: siteConfig.schoolTransport,
  accreditationLogos: {},
  logo: null,
  heroImage: null,
  schoolImage: null,
};

export async function getSettings(): Promise<SiteSettings> {
  const row = await fetchData<SettingsRow>("/items/settings", "settings");
  if (!row) return fallbackSettings;
  return {
    name: row.name,
    legalName: row.legal_name,
    tagline: row.tagline,
    subtitle: row.subtitle,
    description: row.description,
    url: row.url,
    founded: row.founded,
    pricing: row.pricing ?? siteConfig.pricing,
    phone: { display: row.phone_display, href: row.phone_href, hours: row.phone_hours },
    email: { general: row.email_general, bookings: row.email_bookings },
    address: {
      line1: row.address_line1,
      line2: row.address_line2,
      city: row.address_city,
      county: row.address_county,
      postcode: row.address_postcode,
    },
    nav: row.nav,
    footerColumns: row.footer_columns,
    legalLinks: row.legal_links,
    stats: row.stats ?? siteConfig.stats,
    accreditations: row.accreditations ?? siteConfig.accreditations,
    coverage: row.coverage ?? siteConfig.coverage,
    faqs: row.faqs ?? siteConfig.faqs,
    // Merge homepage copy so newly-added keys fall back to the seed defaults even if
    // the client's stored blob predates them.
    homepage: { ...siteConfig.homepage, ...(row.homepage ?? {}) },
    fleetPage: { ...siteConfig.fleetPage, ...(row.fleet_page ?? {}) },
    // Schools list/config is authoritative in site-content; logos (Directus file ids)
    // are merged in from the school_transport blob, keyed by school slug.
    schoolTransport: mergeSchoolLogos(row.school_transport),
    accreditationLogos: row.accreditation_logos ?? {},
    logo: row.logo ?? null,
    heroImage: row.hero_image ?? null,
    schoolImage: row.school_image ?? null,
  };
}

interface SchoolTransportBlob {
  logos?: Record<string, string>;
}

function mergeSchoolLogos(blob: SchoolTransportBlob | null | undefined): SchoolTransport {
  const logos = blob?.logos ?? {};
  return {
    schools: siteConfig.schoolTransport.schools.map((s) => ({ ...s, logo: logos[s.slug] ?? null })),
  };
}

export async function getServices(): Promise<ServiceCard[]> {
  const rows = await fetchData<ServiceRow[]>("/items/services?sort=sort&limit=-1", "services");
  if (!rows || rows.length === 0) return siteConfig.services;
  return rows.map(({ title, blurb, href, icon, image }) => ({
    title,
    blurb,
    href,
    icon: icon ?? undefined,
    image: image ?? null,
  }));
}

function toVehicle(row: FleetRow): FleetVehicle {
  return {
    slug: row.slug,
    groupLabel: row.group_label ?? siteConfig.fleet.find((vehicle) => vehicle.slug === row.slug)?.groupLabel ?? "",
    name: row.name,
    seats: row.seats,
    summary: row.summary,
    features: row.features,
    layoutImages: row.layout_images ?? [],
    image: row.image ?? null,
    gallery: row.gallery ?? [],
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
  };
}

export async function getFleet(): Promise<FleetVehicle[]> {
  const rows = await fetchData<FleetRow[]>("/items/fleet?sort=sort&limit=-1", "fleet");
  if (!rows || rows.length === 0) return siteConfig.fleet;
  return rows.map(toVehicle);
}

export async function getFleetVehicle(slug: string): Promise<FleetVehicle | null> {
  const rows = await fetchData<FleetRow[]>(
    `/items/fleet?filter[slug][_eq]=${encodeURIComponent(slug)}&limit=1`,
    `fleet:${slug}`,
  );
  if (rows && rows.length > 0) return toVehicle(rows[0]);
  return siteConfig.fleet.find((v) => v.slug === slug) ?? null;
}

/** Raw `pages` row as stored in Directus. */
interface PageRow {
  slug: string;
  title: string;
  subtitle: string;
  body: string;
  image: string | null;
  seo_title: string;
  seo_description: string;
}

function toPage(row: PageRow): Page {
  return {
    slug: row.slug,
    title: row.title,
    subtitle: row.subtitle,
    body: row.body,
    seoTitle: row.seo_title,
    image: row.image ?? null,
    seoDescription: row.seo_description,
  };
}

export async function getPages(): Promise<Page[]> {
  const rows = await fetchData<PageRow[]>("/items/pages?sort=sort&limit=-1", "pages");
  if (!rows || rows.length === 0) return siteConfig.pages;
  return rows.map(toPage);
}

export async function getPage(slug: string): Promise<Page | null> {
  const rows = await fetchData<PageRow[]>(
    `/items/pages?filter[slug][_eq]=${encodeURIComponent(slug)}&limit=1`,
    `pages:${slug}`,
  );
  if (rows && rows.length > 0) return toPage(rows[0]);
  return siteConfig.pages.find((p) => p.slug === slug) ?? null;
}

// ---- tours (T2: UK Tours) ----
interface TourRow {
  slug: string;
  destination: string;
  summary: string;
  body: string;
  image: string | null;
  seo_title: string;
  seo_description: string;
}

function toTour(row: TourRow): Tour {
  return {
    slug: row.slug,
    destination: row.destination,
    summary: row.summary,
    body: row.body,
    image: row.image ?? null,
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
  };
}

export async function getTours(): Promise<Tour[]> {
  const rows = await fetchData<TourRow[]>("/items/tours?sort=sort&limit=-1", "tours");
  if (!rows || rows.length === 0) return siteConfig.tours;
  return rows.map(toTour);
}

export async function getTour(slug: string): Promise<Tour | null> {
  const rows = await fetchData<TourRow[]>(
    `/items/tours?filter[slug][_eq]=${encodeURIComponent(slug)}&limit=1`,
    `tours:${slug}`,
  );
  if (rows && rows.length > 0) return toTour(rows[0]);
  return siteConfig.tours.find((t) => t.slug === slug) ?? null;
}

// ---- routes (T3: Daily Express) ----
interface RouteRow {
  slug: string;
  from: string;
  to: string;
  days: string;
  price_single: number;
  price_return: number;
  summary: string;
  stops: RouteStop[];
  seo_title: string;
  seo_description: string;
}

function toRoute(row: RouteRow): CoachRoute {
  return {
    slug: row.slug,
    from: row.from,
    to: row.to,
    days: row.days,
    priceSingle: row.price_single,
    priceReturn: row.price_return,
    summary: row.summary,
    stops: row.stops,
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
  };
}

export async function getRoutes(): Promise<CoachRoute[]> {
  const rows = await fetchData<RouteRow[]>("/items/routes?sort=sort&limit=-1", "routes");
  if (!rows || rows.length === 0) return siteConfig.routes;
  return rows.map(toRoute);
}

export async function getRoute(slug: string): Promise<CoachRoute | null> {
  const rows = await fetchData<RouteRow[]>(
    `/items/routes?filter[slug][_eq]=${encodeURIComponent(slug)}&limit=1`,
    `routes:${slug}`,
  );
  if (rows && rows.length > 0) return toRoute(rows[0]);
  return siteConfig.routes.find((r) => r.slug === slug) ?? null;
}

// ---- stops (Daily Express corridor; stop-to-stop booking) ----
export async function getStops(): Promise<Stop[]> {
  const rows = await fetchData<Stop[]>("/items/stops?sort=sort&limit=-1", "stops");
  if (!rows || rows.length === 0) return siteConfig.stops;
  return rows.map(({ code, name, detail }) => ({ code, name, detail }));
}

// ---- school routes (home-to-school timetables) ----
interface SchoolRouteRow {
  school: string;
  code: string;
  name: string;
  return_note: string;
  stops: SchoolRoute["stops"];
}

function toSchoolRoute(row: SchoolRouteRow): SchoolRoute {
  return { school: row.school, code: row.code, name: row.name, returnNote: row.return_note, stops: row.stops };
}

export async function getSchoolRoutes(school?: string): Promise<SchoolRoute[]> {
  const filter = school ? `&filter[school][_eq]=${encodeURIComponent(school)}` : "";
  const rows = await fetchData<SchoolRouteRow[]>(`/items/school_routes?sort=sort&limit=-1${filter}`, "school_routes");
  if (!rows || rows.length === 0) {
    return school ? siteConfig.schoolRoutes.filter((r) => r.school === school) : siteConfig.schoolRoutes;
  }
  return rows.map(toSchoolRoute);
}

// ---- blog (T4) ----
interface BlogRow {
  slug: string;
  title: string;
  excerpt: string;
  author: string;
  date: string;
  body: string;
  seo_title: string;
  thumbnail: DirectusFileRef;
  seo_description: string;
}

function toBlogPost(row: BlogRow): BlogPost {
  return {
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    author: row.author,
    date: row.date,
    body: row.body,
    seoTitle: row.seo_title,
    thumbnail: typeof row.thumbnail === "string" ? row.thumbnail : row.thumbnail?.id ?? null,
    seoDescription: row.seo_description,
  };
}

export async function getBlogPosts(): Promise<BlogPost[]> {
  const rows = await fetchData<BlogRow[]>("/items/blog_posts?sort=-date&limit=-1", "blog_posts");
  if (!rows || rows.length === 0) return siteConfig.blogPosts;
  return rows.map(toBlogPost);
}

export async function getBlogPost(slug: string): Promise<BlogPost | null> {
  const rows = await fetchData<BlogRow[]>(
    `/items/blog_posts?filter[slug][_eq]=${encodeURIComponent(slug)}&limit=1`,
    `blog_posts:${slug}`,
  );
  if (rows && rows.length > 0) return toBlogPost(rows[0]);
  return siteConfig.blogPosts.find((p) => p.slug === slug) ?? null;
}

// ---- testimonials (T7) ----
interface TestimonialRow {
  id: number;
  sort: number | null;
  quote: string;
  author: string;
  role: string;
  company: string | null;
  image: string | null;
  rating: number | null;
}

export async function getTestimonials(): Promise<Testimonial[]> {
  const rows = await fetchData<TestimonialRow[]>("/items/testimonials?sort=sort&limit=-1", "testimonials");
  if (!rows || rows.length === 0) return siteConfig.testimonials;
  return rows.map(({ quote, author, role, company, image, rating }) => ({
    quote,
    author,
    role,
    company: company ?? undefined,
    image: image ?? null,
    rating: rating ?? undefined,
  }));
}
