import type { CoachRoute, ScheduledService, Stop } from "@/lib/site-config";

/** Renders a single route's timetable as a responsive table. Reused on route pages and the Daily Express hub. */
export function RouteTimetable({ route, services = [], stops = [] }: { route: CoachRoute; services?: ScheduledService[]; stops?: Stop[] }) {
  if (services.length) {
    return (
      <div className="grid gap-6">
        {services.map((service) => (
          <section key={service.code} className="overflow-hidden rounded-xl border border-greyblue/30">
            <div className="flex flex-wrap items-center justify-between gap-2 bg-navy px-4 py-3 text-offwhite">
              <h4 className="font-semibold">{service.label}</h4>
              <span className="text-xs text-greyblue">{service.salesMode === "driver_only" ? "Tickets available from the driver" : "Online service"}</span>
            </div>
            <table className="w-full text-left text-sm">
              <thead className="bg-greyblue/10 text-navy">
                <tr><th className="px-4 py-3">Time</th><th className="px-4 py-3">Stop</th><th className="px-4 py-3">Use</th></tr>
              </thead>
              <tbody className="divide-y divide-greyblue/20 bg-white">
                {service.stops.map((stop) => (
                  <tr key={`${service.code}-${stop.code}`}>
                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-navy">{stop.time}</td>
                    <td className="px-4 py-3 text-navy">{stops.find((item) => item.code === stop.code)?.name ?? stop.code}</td>
                    <td className="px-4 py-3 text-navy/70">{stop.boarding && stop.dropping ? "Board / alight" : stop.boarding ? "Board" : "Alight"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {service.notice && <p className="border-t border-greyblue/20 bg-tint-soft px-4 py-3 text-xs text-navy/70">{service.notice}</p>}
          </section>
        ))}
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-xl border border-greyblue/30">
      <table className="w-full text-left text-sm">
        <thead className="bg-navy text-offwhite">
          <tr>
            <th className="px-4 py-3 font-semibold">Time</th>
            <th className="px-4 py-3 font-semibold">Stop</th>
            <th className="px-4 py-3 font-semibold">Location</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-greyblue/20 bg-white">
          {route.stops.map((stop, i) => (
            <tr key={`${stop.time}-${i}`}>
              <td className="whitespace-nowrap px-4 py-3 font-semibold text-navy">{stop.time}</td>
              <td className="px-4 py-3 text-navy">{stop.place}</td>
              <td className="px-4 py-3 text-navy/70">{stop.detail}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
