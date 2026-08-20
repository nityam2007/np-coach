import Image from "next/image";
import { assetUrl } from "@/lib/directus";
import { Reveal } from "@/components/ui/motion";

/** Wide CMS-managed banner shared by bespoke interior pages. */
export function PageBanner({ image, alt, priority = false }: { image: string | null; alt: string; priority?: boolean }) {
  const src = assetUrl(image);
  if (!src) return null;

  return (
    <section className="bg-offwhite">
      <div className="mx-auto max-w-7xl px-4 pt-10 sm:px-6">
        <Reveal>
          <div className="relative aspect-[21/9] min-h-52 overflow-hidden rounded-3xl bg-greyblue/15 shadow-lg shadow-navy/10">
            <Image
              src={src}
              alt={alt}
              fill
              priority={priority}
              sizes="(max-width: 1280px) 100vw, 1200px"
              className="object-cover"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-navy/55 via-navy/10 to-transparent" />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
