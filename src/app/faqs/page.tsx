import { notFound } from "next/navigation";
import { PageHero } from "@/components/sections/PageHero";
import { FaqAccordion } from "@/components/sections/FaqAccordion";
import { getPage, getSettings } from "@/lib/directus";
import { buildMetadata } from "@/lib/seo";

export async function generateMetadata() {
  const page = await getPage("faqs");
  if (!page) return {};

  return buildMetadata({
    title: page.seoTitle,
    description: page.seoDescription,
    path: "/faqs",
    titleAbsolute: true,
  });
}

/** Dedicated FAQ destination using the CMS-managed FAQ list and SEO content. */
export default async function FaqPage() {
  const [settings, page] = await Promise.all([getSettings(), getPage("faqs")]);
  if (!page) notFound();

  return (
    <article>
      <PageHero
        title={page.title}
        intro={page.subtitle}
        crumbs={[{ label: "Home", href: "/" }, { label: page.title }]}
      />
      <FaqAccordion faqs={settings.faqs} />
    </article>
  );
}
