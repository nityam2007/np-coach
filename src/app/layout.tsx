import type { Metadata } from "next";
import localFont from "next/font/local";
import { GeistSans } from "geist/font/sans";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { CookieConsent } from "@/components/layout/CookieConsent";
import { OrganizationJsonLd } from "@/components/seo/OrganizationJsonLd";
import { getSettings } from "@/lib/directus";

// Self-hosted Inter (variable) — no build-time Google Fonts fetch, so builds are
// deterministic and work offline / in CI. Geist is likewise self-hosted via `geist`.
const inter = localFont({
  src: "./fonts/inter-variable.woff2",
  variable: "--font-inter",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
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
    },
    twitter: { card: "summary_large_image" },
    formatDetection: { telephone: true },
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings();

  return (
    <html lang="en-GB" className={`${GeistSans.variable} ${inter.variable}`}>
      <body className="flex min-h-dvh flex-col bg-offwhite font-sans text-navy antialiased">
        <OrganizationJsonLd settings={settings} />
        <Header settings={settings} />
        <main className="flex-1">{children}</main>
        <Footer settings={settings} />
        <CookieConsent />
      </body>
    </html>
  );
}
