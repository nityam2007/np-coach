import type { Page } from "@/lib/site-config";
import { PageHero } from "@/components/sections/PageHero";
import { Reveal } from "@/components/ui/motion";

/** Renders an editable content page (PageHero + HTML body). One change here upgrades
 *  every CMS content page (About, FAQs, legal, …). */
export function PageTemplate({ page }: { page: Page }) {
  return (
    <article>
      <PageHero
        title={page.title}
        intro={page.subtitle}
        crumbs={[{ label: "Home", href: "/" }, { label: page.title }]}
      />

      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <Reveal>
          <div className="prose" dangerouslySetInnerHTML={{ __html: page.body }} />
        </Reveal>
      </section>
    </article>
  );
}
