import Link from "next/link";
import Image from "next/image";
import type { FleetVehicle } from "@/lib/site-config";
import { assetUrl } from "@/lib/directus";

/** Fleet vehicle card with photo — used in the homepage teaser and the /fleet listing. */
export function FleetCard({ vehicle }: { vehicle: FleetVehicle }) {
  const img = assetUrl(vehicle.image);

  return (
    <Link
      href={`/${vehicle.slug}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-greyblue/30 bg-white transition-shadow hover:shadow-lg"
    >
      <div className="relative aspect-[3/2] w-full overflow-hidden bg-greyblue/10">
        {img ? (
          <Image
            src={img}
            alt={`${vehicle.name} coach`}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="grid h-full place-items-center text-greyblue">
            <span className="font-display text-sm">{vehicle.name}</span>
          </div>
        )}
        <span className="absolute right-3 top-3 rounded-full bg-navy/90 px-3 py-1 text-xs font-semibold text-offwhite">
          {vehicle.seats} seats
        </span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-lg font-semibold text-navy">{vehicle.name}</h3>
        <p className="mt-2 flex-1 text-sm text-navy/70">{vehicle.summary}</p>
        <span className="mt-4 inline-block text-sm font-semibold text-accent group-hover:underline">View details →</span>
      </div>
    </Link>
  );
}
