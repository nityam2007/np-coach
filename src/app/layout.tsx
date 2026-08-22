import type { Metadata } from "next";
import localFont from "next/font/local";
import { GeistSans } from "geist/font/sans";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { CookieConsent } from "@/components/layout/CookieConsent";
import { OrganizationJsonLd } from "@/components/seo/OrganizationJsonLd";
import { assetUrl, getSettings } from "@/lib/directus";

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

  return {
    metadataBase: new URL(s.url),
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
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings();

  return (
    <html lang="en-GB" className={`${GeistSans.variable} ${inter.variable}`}>
      <body className="flex min-h-dvh flex-col bg-offwhite font-sans text-navy antialiased">
        <a href="#main-content" className="sr-only z-[100] rounded bg-white px-4 py-3 font-semibold text-navy focus:not-sr-only focus:fixed focus:left-4 focus:top-4">Skip to main content</a>
        <OrganizationJsonLd settings={settings} />
        <Header settings={settings} />
        <main id="main-content" tabIndex={-1} className="flex-1">{children}</main>
        <Footer settings={settings} />
        <CookieConsent />
      </body>
    </html>
  );
}
