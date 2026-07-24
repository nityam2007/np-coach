import Link from "next/link";
import Image from "next/image";
import type { ServiceCard } from "@/lib/site-config";
import { assetUrl } from "@/lib/directus";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Reveal, Stagger, StaggerItem } from "@/components/ui/motion";

/** Homepage services grid — centred heading + photo cards with an accent icon badge. */
export function ServiceCards({
  services,
  eyebrow,
  heading,
  body,
}: {
  services: ServiceCard[];
  eyebrow: string;
  heading: string;
  body: string;
}) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-20">
      <Reveal className="mx-auto max-w-2xl text-center">
        <Eyebrow shiny>{eyebrow}</Eyebrow>
        <h2 className="mt-3 font-display text-3xl font-bold text-navy sm:text-4xl">{heading}</h2>
        <p className="mt-3 text-navy/60">{body}</p>
      </Reveal>

      <Stagger className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4" gap={0.1}>
        {services.map((service) => {
          const img = assetUrl(service.image);
          return (
            <StaggerItem key={service.href + service.title} className="h-full">
            <Link
              href={service.href}
              className="group flex h-full flex-col overflow-hidden rounded-2xl border border-greyblue/20 bg-white shadow-sm transition duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-navy/10"
            >
              <div className="relative aspect-[4/3] w-full bg-navy/5">
                {/* Inner wrapper clips the image/hover-scale; the badge sits outside it so
                    its overhang into the text area isn't cut off. */}
                <div className="absolute inset-0 overflow-hidden">
                  {img ? (
                    <Image
                      src={img}
                      alt={service.title}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="grid h-full place-items-center text-greyblue">
                      <Icon name="bus" className="h-10 w-10" />
                    </div>
                  )}
                </div>
                <span className="absolute -bottom-5 left-5 z-10 grid h-11 w-11 place-items-center rounded-xl bg-accent text-white shadow-lg shadow-accent/30 ring-4 ring-white">
                  <Icon name={(service.icon as IconName) ?? "bus"} className="h-5 w-5" />
                </span>
              </div>
              <div className="flex flex-1 flex-col p-6 pt-8">
                <h3 className="font-display text-lg font-semibold text-navy">{service.title}</h3>
                <p className="mt-2 flex-1 text-sm text-navy/60">{service.blurb}</p>
                <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-accent">
                  Learn more
                  <Icon name="arrowRight" className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
              </div>
            </Link>
            </StaggerItem>
          );
        })}
      </Stagger>
    </section>
  );
}
