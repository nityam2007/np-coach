import type { CoachRoute } from "@/lib/site-config";

/** Renders a single route's timetable as a responsive table. Reused on route pages and the Daily Express hub. */
export function RouteTimetable({ route }: { route: CoachRoute }) {
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
