import { NextRequest, NextResponse } from "next/server";
import { getScheduledServices } from "@/lib/directus";
import { directusInventoryReady, directusServerRead } from "@/lib/directus-server";

export const dynamic = "force-dynamic";

interface ServiceRunRow {
  service_code: string;
  capacity: number;
  booked_seats: number;
  status: string;
}

interface ServiceAvailability {
  remaining: number;
  capacity: number;
}

export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get("date") ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Invalid service date" }, { status: 400 });
  }

  const [allServices, rows, inventoryReady] = await Promise.all([
    getScheduledServices(),
    directusServerRead<ServiceRunRow[]>(
      "/items/service_runs?fields=service_code,capacity,booked_seats,status"
        + "&filter[service_date][_eq]=" + encodeURIComponent(date)
        + "&limit=100",
    ),
    directusInventoryReady(),
  ]);
  const services = allServices.filter((service) => service.salesMode === "online");
  const canReserve = inventoryReady && rows !== null;
  const runs = new Map((rows ?? []).map((row) => [row.service_code, row]));

  const availability = Object.fromEntries(services.map((service): [string, ServiceAvailability | null] => {
    if (!canReserve) return [service.code, null];

    if (!Number.isInteger(service.capacity) || service.capacity < 1 || service.capacity > 500) {
      return [service.code, null];
    }
    const run = runs.get(service.code);
    if (!run) {
      return [service.code, { remaining: service.capacity, capacity: service.capacity }];
    }
    if (!Number.isInteger(run.capacity) || run.capacity < 1 || run.capacity > 500
      || !Number.isInteger(run.booked_seats) || run.booked_seats < 0) {
      return [service.code, null];
    }
    if (run.status !== "scheduled") {
      return [service.code, { remaining: 0, capacity: run.capacity }];
    }

    return [
      service.code,
      {
        remaining: Math.max(0, run.capacity - run.booked_seats),
        capacity: run.capacity,
      },
    ];
  }));

  return NextResponse.json(
    { date, inventoryReady: canReserve, availability },
    { headers: { "Cache-Control": "private, no-store, max-age=0" } },
  );
}
