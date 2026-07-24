import content from "./site-content.json";

/**
 * Typed site content. The data lives in `site-content.json` (single source) and is:
 *   1. used to seed Directus (see scripts/seed-directus.mjs), and
 *   2. the fallback when Directus is unreachable (see lib/directus.ts).
 *
 * At runtime the live site reads this content from Directus so the client can edit it.
 */

export interface NavLink {
  label: string;
  href: string;
  /** Optional icon key (mega-menu entries) — see components/ui/Icon. */
  icon?: string;
  /** Optional one-line description (mega-menu entries). */
  description?: string;
  /** Optional dropdown children (e.g. Services → Fleet, UK Tours, …). */
  children?: NavLink[];
}

export interface FooterColumn {
  title: string;
  links: NavLink[];
}

export interface ServiceCard {
  title: string;
  blurb: string;
  href: string;
  /** Icon key rendered on the card (see components/ui/Icon). */
  icon?: string;
  /** Directus file id (optional photo). */
  image?: string | null;
}

export interface Stat {
  value: string;
  label: string;
}

export interface FleetVehicle {
  slug: string;
  name: string;
  seats: number;
  summary: string;
  features: string[];
  /** Directus file id for the exterior photo (rendered via /assets/<id>). */
  image?: string | null;
  /** Directus file ids for the detail-page gallery. */
  gallery?: string[];
  seoTitle: string;
  seoDescription: string;
}

export interface Page {
  slug: string;
  title: string;
  subtitle: string;
  body: string;
  seoTitle: string;
  seoDescription: string;
}

export interface Tour {
  slug: string;
  destination: string;
  summary: string;
  body: string;
  /** Directus file id for the destination hero photo. */
  image?: string | null;
  seoTitle: string;
  seoDescription: string;
}

/** A school served by home-to-school transport (logo set via Directus media). */
export interface SchoolTransportSchool {
  slug: string;
  name: string;
  intro: string;
  logo?: string | null;
  /** External Trackaroo "buy tickets" URL for this school. */
  buyUrl: string;
  /** Optional ShuttleID waiting-list URL (when no spaces are available). */
  waitlistUrl?: string;
  spacesAvailable: boolean;
}
export interface SchoolTransport {
  schools: SchoolTransportSchool[];
}

export interface SchoolRouteStop {
  time: string;
  place: string;
}

/** A timetabled school route (e.g. PSA Burnham, HGS XR1). */
export interface SchoolRoute {
  school: string; // school slug
  code: string;
  name: string;
  returnNote: string;
  stops: SchoolRouteStop[];
}

export interface RouteStop {
  time: string;
  place: string;
  detail: string;
}

export interface CoachRoute {
  slug: string;
  from: string;
  to: string;
  days: string;
  /** Fares in pence (GBP), computed server-side — never trust client-sent prices. */
  priceSingle: number;
  priceReturn: number;
  summary: string;
  stops: RouteStop[];
  seoTitle: string;
  seoDescription: string;
}

export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  author: string;
  date: string;
  body: string;
  seoTitle: string;
  seoDescription: string;
}

export interface Faq {
  question: string;
  answer: string;
}

export interface Testimonial {
  quote: string;
  author: string;
  role: string;
  /** Organisation the author represents (optional). */
  company?: string;
  /** Directus file id for the author photo (optional — falls back to initials). */
  image?: string | null;
  /** Star rating 1–5 (defaults to 5 when omitted). */
  rating?: number;
}

/** Third-party review badge shown in the hero (e.g. Trustpilot 4.9/5). */
export interface HeroRating {
  platform: string;
  score: string;
  reviews: string;
}

/** A small trust feature under the hero search bar (icon + copy). */
export interface SearchFeature {
  icon: string;
  title: string;
  blurb: string;
}

/** A labelled call-to-action link. */
export interface Cta {
  label: string;
  href: string;
}

/** Homepage school-transport highlight block. */
export interface HomeSchoolBlock {
  eyebrow: string;
  heading: string;
  body: string;
  highlights: string[];
  cta: Cta;
}

/** Homepage nationwide-coverage block. */
export interface CoverageBlock {
  eyebrow: string;
  heading: string;
  body: string;
  cta: Cta;
}

/**
 * All bespoke homepage copy, kept in one editable blob so the whole landing page
 * is CMS-driven (settings.homepage) without a column per string.
 */
export interface HomepageContent {
  heroEyebrow: string;
  /** Word/phrase within the tagline to highlight in the accent colour (e.g. "UK"). */
  heroHighlight: string;
  heroRating: HeroRating;
  heroPrimaryCta: Cta;
  heroSecondaryCta: Cta;
  searchFeatures: SearchFeature[];
  servicesEyebrow: string;
  servicesHeading: string;
  servicesBody: string;
  fleetEyebrow: string;
  fleetHeading: string;
  fleetBody: string;
  fleetCta: Cta;
  school: HomeSchoolBlock;
  coverage: CoverageBlock;
  clientsEyebrow: string;
  clientsHeading: string;
  ctaEyebrow: string;
  ctaHeading: string;
  ctaBody: string;
}

/** Configurable money/tax. Fees in pence (GBP); VAT rates as whole-number percentages. */
export interface Pricing {
  /** Lost-property reclaim admin fee, net of VAT, in pence. */
  lostPropertyFee: number;
  /** VAT rate (%) applied to the lost-property fee. */
  lostPropertyVat: number;
  /** VAT rate (%) applied to Daily Express fares (0 = fares already VAT-inclusive). */
  dailyExpressVat: number;
  /** Daily Express flat single fare per passenger (pence) — applies to any leg. */
  dailyExpressSingle: number;
  /** Daily Express flat return fare per passenger (pence). */
  dailyExpressReturn: number;
}

/** A Daily Express corridor stop (drives the From/To pickers and timetables). */
export interface Stop {
  code: string;
  name: string;
  detail: string;
}

export interface SiteContent {
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
  services: ServiceCard[];
  footerColumns: FooterColumn[];
  legalLinks: NavLink[];
  stats: Stat[];
  accreditations: string[];
  coverage: string[];
  faqs: Faq[];
  testimonials: Testimonial[];
  homepage: HomepageContent;
  schoolTransport: SchoolTransport;
  schoolRoutes: SchoolRoute[];
  fleet: FleetVehicle[];
  pages: Page[];
  tours: Tour[];
  routes: CoachRoute[];
  stops: Stop[];
  blogPosts: BlogPost[];
}

export const siteConfig = content as SiteContent;
