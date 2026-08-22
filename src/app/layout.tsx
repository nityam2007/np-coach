import type { Metadata } from "next";
import localFont from "next/font/local";
import { GeistSans } from "geist/font/sans";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { CookieConsent } from "@/components/layout/CookieConsent";
import { OrganizationJsonLd } from "@/components/seo/OrganizationJsonLd";
import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics";
import { assetUrl, getServices, getSettings } from "@/lib/directus";
import { siteUrl } from "@/lib/site-url";

// Self-hosted Inter (variable) — no build-time Google Fonts fetch, so builds are
// deterministic and work offline / in CI. Geist is likewise self-hosted via `geist`.
const inter = localFont({
  src: "./fonts/inter-variable.woff2",
  variable: "--font-inter",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  const socialImage = assetUrl(s.heroImage);
  const publicUrl = siteUrl(s.url);

  return {
    metadataBase: new URL(publicUrl),
    title: { default: `${s.name} — ${s.tagline}`, template: `%s | ${s.name}` },
    description: s.description,
    openGraph: {
      type: "website",
      siteName: s.name,
      locale: "en_GB",
      title: `${s.name} — ${s.tagline}`,
      description: s.description,
      ...(socialImage ? { images: [{ url: socialImage, alt: s.heroImageAlt }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      ...(socialImage ? { images: [socialImage] } : {}),
    },
    formatDetection: { telephone: true },
    verification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
      ? { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION }
      : undefined,
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [settings, services] = await Promise.all([getSettings(), getServices()]);

  return (
    <html lang="en-GB" className={`${GeistSans.variable} ${inter.variable}`}>
      <body className="flex min-h-dvh flex-col bg-offwhite font-sans text-navy antialiased">
        <a href="#main-content" className="sr-only z-[100] rounded bg-white px-4 py-3 font-semibold text-navy focus:not-sr-only focus:fixed focus:left-4 focus:top-4">Skip to main content</a>
        <GoogleAnalytics measurementId={process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID} />
        <OrganizationJsonLd settings={settings} services={services} />
        <Header settings={settings} />
        <main id="main-content" tabIndex={-1} className="flex-1">{children}</main>
        <Footer settings={settings} />
        <CookieConsent content={settings.cookieConsent} />
      </body>
    </html>
  );
}
