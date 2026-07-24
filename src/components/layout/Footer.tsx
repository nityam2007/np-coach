"use client";

import Link from "next/link";
import type { SiteSettings } from "@/lib/directus";
import { Icon } from "@/components/ui/Icon";
import { Reveal, Stagger, StaggerItem } from "@/components/ui/motion";
import { StripesBackdrop, FloatingBlobs } from "@/components/ui/Backdrops";

/** Site footer: CTA band, brand blurb, link columns, contact block, legal bar — on a
 *  textured navy backdrop (stripes + glows), with reveal-on-scroll columns. */
export function Footer({ settings }: { settings: SiteSettings }) {
  const { address, phone, email } = settings;
  const year = new Date().getFullYear();

  return (
    <footer className="relative overflow-hidden bg-gradient-to-br from-navy via-navy to-brand-deep text-greyblue">
      <StripesBackdrop dark />
      <FloatingBlobs dark />

      {/* Closing CTA band */}
      <Reveal className="mx-auto max-w-7xl px-4 pt-14 sm:px-6">
        <div className="flex flex-col items-center gap-5 rounded-3xl border border-white/10 bg-white/[0.03] p-8 text-center backdrop-blur sm:flex-row sm:justify-between sm:text-left lg:p-10">
          <div>
            <p className="font-display text-xs font-semibold uppercase tracking-[0.18em] text-sky-400">
              {settings.homepage.ctaEyebrow}
            </p>
            <h2 className="mt-2 font-display text-2xl font-bold text-offwhite sm:text-3xl">
              {settings.homepage.ctaHeading}
            </h2>
            <p className="mt-2 text-sm text-greyblue">{settings.homepage.ctaBody}</p>
          </div>
          <Link
            href="/get-a-quote"
            className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 font-semibold text-white shadow-sm shadow-accent/20 transition-all hover:bg-brand-hover hover:shadow-md"
          >
            Get a Quote
            <Icon name="arrowRight" className="h-4 w-4" />
          </Link>
        </div>
      </Reveal>

      <Stagger className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 sm:grid-cols-2 lg:grid-cols-4">
        {settings.footerColumns
          .filter((col) => col.title.toLowerCase() !== "school transport")
          .map((col) => (
          <StaggerItem key={col.title}>
            <h3 className="font-display text-sm font-semibold uppercase tracking-wide text-offwhite">{col.title}</h3>
            <ul className="mt-4 space-y-2">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="group inline-flex items-center gap-1.5 text-sm transition-colors hover:text-offwhite"
                  >
                    <span className="h-px w-0 bg-sky-400 transition-all duration-300 group-hover:w-4" aria-hidden="true" />
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </StaggerItem>
        ))}

        <StaggerItem>
          <h3 className="font-display text-sm font-semibold uppercase tracking-wide text-offwhite">Contact</h3>
          <address className="mt-4 space-y-3 text-sm not-italic">
            <p className="flex items-start gap-2">
              <Icon name="mapPin" className="mt-0.5 h-4 w-4 shrink-0 text-sky-400" />
              <span>
                {address.line1}, {address.line2}
                <br />
                {address.city}, {address.county}
                <br />
                {address.postcode}
              </span>
            </p>
            <p className="flex items-center gap-2">
              <Icon name="phone" className="h-4 w-4 shrink-0 text-sky-400" />
              <a href={phone.href} className="transition-colors hover:text-offwhite">
                {phone.display}
              </a>
            </p>
            <p className="flex items-center gap-2">
              <Icon name="arrowRight" className="h-4 w-4 shrink-0 text-sky-400" />
              <a href={`mailto:${email.general}`} className="transition-colors hover:text-offwhite">
                {email.general}
              </a>
            </p>
          </address>
        </StaggerItem>
      </Stagger>

      <div className="relative border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-xs sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>
            © {year} {settings.legalName}. All rights reserved.
          </p>
          <div className="flex flex-wrap gap-4">
            {settings.legalLinks.map((l) => (
              <Link key={l.href} href={l.href} className="transition-colors hover:text-offwhite">
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
