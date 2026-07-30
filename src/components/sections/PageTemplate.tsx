import type { Page } from "@/lib/site-config";
import Image from "next/image";
import { PageHero } from "@/components/sections/PageHero";
import { Reveal } from "@/components/ui/motion";
import { assetUrl } from "@/lib/directus";

/** Renders an editable content page (PageHero + HTML body). One change here upgrades
 *  every CMS content page (About, FAQs, legal, …). */
export function PageTemplate({ page }: { page: Page }) {
  const image = assetUrl(page.image);

  return (
    <article>
      <PageHero
        title={page.title}
        intro={page.subtitle}
        crumbs={[{ label: "Home", href: "/" }, { label: page.title }]}
      />

      <section className="bg-gradient-to-b from-offwhite via-tint-soft/70 to-offwhite">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
          {image && (
            <Reveal>
              <div className="relative mb-8 aspect-[16/7] overflow-hidden rounded-3xl bg-greyblue/15 shadow-lg shadow-navy/10">
                <Image
                  src={image}
                  alt=""
                  fill
                  sizes="(max-width: 1024px) 100vw, 960px"
                  className="object-cover"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-navy/30 via-transparent to-transparent" />
              </div>
            </Reveal>
          )}
          <Reveal>
            <div className="relative overflow-hidden rounded-3xl border border-accent/10 bg-white px-6 py-9 shadow-md shadow-navy/5 sm:px-10 sm:py-14">
              <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-accent via-sky-400 to-accent/20" />
              <div className="prose mx-auto max-w-3xl" dangerouslySetInnerHTML={{ __html: page.body }} />
            </div>
          </Reveal>
        </div>
      </section>
    </article>
  );
}
