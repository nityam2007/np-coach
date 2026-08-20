import Image from "next/image";
import Link from "next/link";
import type { FleetVehicle } from "@/lib/site-config";
import { assetUrl } from "@/lib/directus";
import { featureIcon } from "@/lib/feature-icon";
import { Icon } from "@/components/ui/Icon";
import { Reveal } from "@/components/ui/motion";

/** Editorial fleet listing with alternating photography and useful specifications. */
export function FleetShowcase({ vehicles }: { vehicles: FleetVehicle[] }) {
  return (
    <div className="space-y-8 lg:space-y-12">
      {vehicles.map((vehicle, index) => {
        const image = assetUrl(vehicle.image);
        return (
          <Reveal key={vehicle.slug} className="group grid overflow-hidden rounded-3xl border border-navy/10 bg-white shadow-sm transition-shadow hover:shadow-xl lg:grid-cols-2">
            <div className={`relative min-h-72 bg-tint-soft lg:min-h-[25rem] ${index % 2 ? "lg:order-2" : ""}`}>
              {image ? <Image src={image} alt={vehicle.imageAlt ?? ""} fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover transition-transform duration-700 group-hover:scale-[1.03]" /> : <div className="grid h-full place-items-center text-navy/30"><Icon name="bus" className="h-16 w-16" /></div>}
              <span className="absolute left-5 top-5 rounded-full bg-navy/90 px-4 py-2 text-sm font-semibold text-white shadow-lg">{vehicle.seats} seats</span>
            </div>
            <div className={`flex flex-col justify-center p-7 sm:p-10 lg:p-12 ${index % 2 ? "lg:order-1" : ""}`}>
              <p className="font-display text-xs font-semibold uppercase tracking-[0.18em] text-accent">{vehicle.groupLabel}</p>
              <h3 className="mt-3 font-display text-3xl font-bold text-navy">{vehicle.name}</h3>
              <p className="mt-4 leading-7 text-navy/70">{vehicle.summary}</p>
              <ul className="mt-6 grid gap-2 sm:grid-cols-2">
                {vehicle.features.slice(0, 6).map((feature) => <li key={feature} className="flex items-center gap-2 text-sm text-navy/75"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-accent/10 text-accent"><Icon name={featureIcon(feature)} className="h-4 w-4" /></span>{feature}</li>)}
              </ul>
              <Link href={`/${vehicle.slug}`} className="group/link mt-8 inline-flex w-fit items-center gap-2 font-semibold text-accent">{vehicle.name} <Icon name="arrowRight" className="h-4 w-4 transition-transform group-hover/link:translate-x-1" /></Link>
            </div>
          </Reveal>
        );
      })}
    </div>
  );
}