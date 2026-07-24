import type { SchoolRoute } from "@/lib/site-config";

/** Renders one school route's morning pickup timetable + return note. */
export function SchoolRouteTimetable({ route }: { route: SchoolRoute }) {
  return (
    <div>
      <div className="overflow-hidden rounded-xl border border-greyblue/30">
        <table className="w-full text-left text-sm">
          <thead className="bg-navy text-offwhite">
            <tr>
              <th className="w-28 px-4 py-3 font-semibold">Time</th>
              <th className="px-4 py-3 font-semibold">Pickup stop</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-greyblue/20 bg-white">
            {route.stops.map((stop, i) => (
              <tr key={`${stop.time}-${i}`}>
                <td className="whitespace-nowrap px-4 py-3 font-semibold text-navy">{stop.time}</td>
                <td className="px-4 py-3 text-navy/80">{stop.place}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {route.returnNote && <p className="mt-2 text-xs text-navy/70">{route.returnNote}</p>}
    </div>
  );
}
