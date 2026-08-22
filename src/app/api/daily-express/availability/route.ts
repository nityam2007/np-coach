import { NextRequest, NextResponse } from "next/server";
import { getScheduledServices } from "@/lib/directus";
import { directusServerRead } from "@/lib/directus-server";

export const dynamic = "force-dynamic";

interface ServiceRunRow {
  service_code: string;
  capacity: number;
  booked_seats: number;
  status: string;
}

export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get("date") ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Invalid service date" }, { status: 400 });
  }

  const services = (await getScheduledServices()).filter((service) => service.salesMode === "online");
  const rows = await directusServerRead<ServiceRunRow[]>(
    "/items/service_runs?fields=service_code,capacity,booked_seats,status"
      + "&filter[service_date][_eq]=" + encodeURIComponent(date)
      + "&limit=100",
  );

  const runs = new Map((rows ?? []).map((row) => [row.service_code, row]));
  const availability = Object.fromEntries(services.map((service) => {
    if (rows === null) return [service.code, null];

    const run = runs.get(service.code);
    if (!run) return [service.code, service.capacity];
    if (run.status !== "scheduled") return [service.code, 0];

    const capacity = Math.min(service.capacity, Math.max(0, run.capacity));
    return [service.code, Math.max(0, capacity - Math.max(0, run.booked_seats))];
  }));

  return NextResponse.json(
    { date, availability },
    { headers: { "Cache-Control": "private, no-store, max-age=0" } },
  );
}
