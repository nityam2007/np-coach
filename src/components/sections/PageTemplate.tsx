import type { Page } from "@/lib/site-config";
import { PageHero } from "@/components/sections/PageHero";
import { Reveal } from "@/components/ui/motion";
import { Icon } from "@/components/ui/Icon";
import { assetUrl } from "@/lib/directus";

/** Shared CMS page renderer: image-backed hero, body and downloadable files. */
export function PageTemplate({ page }: { page: Page }) {
  return (
    <article>
      <PageHero title={page.title} intro={page.subtitle} crumbs={[{ label: "Home", href: "/" }, { label: page.title }]} image={page.image} imageAlt={page.imageAlt} priority />
      <section className="bg-gradient-to-b from-offwhite via-tint-soft/70 to-offwhite">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
          <Reveal>
            <div className="relative overflow-hidden rounded-3xl border border-accent/10 bg-white px-6 py-9 shadow-md shadow-navy/5 sm:px-10 sm:py-14">
              <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-accent via-sky-400 to-accent/20" />
              <div className="prose mx-auto max-w-3xl" dangerouslySetInnerHTML={{ __html: page.body }} />
              {page.attachments && page.attachments.length > 0 && (
                <ul className="mx-auto mt-10 grid max-w-3xl gap-4">
                  {page.attachments.map((attachment) => {
                    const href = assetUrl(attachment.file) ?? attachment.href;
                    if (!href) return null;
                    return (
                      <li key={attachment.title}>
                        <a href={href} download={attachment.file ? true : undefined} target={attachment.href ? "_blank" : undefined} rel={attachment.href ? "noreferrer" : undefined} className="group flex items-center gap-4 rounded-2xl border border-navy/10 bg-tint-soft p-5 transition-colors hover:border-accent/35 hover:bg-accent/5">
                          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent text-white"><Icon name="download" className="h-5 w-5" /></span>
                          <span className="min-w-0"><span className="block font-display font-semibold text-navy">{attachment.title}</span>{attachment.description && <span className="mt-1 block text-sm text-navy/65">{attachment.description}</span>}</span>
                        </a>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </Reveal>
        </div>
      </section>
    </article>
  );
}