import type { CoachRoute, RouteStop } from "@/lib/site-config";

const hints: Array<[string, string[]]> = [
  ["birmingham-smethwick", ["smethwick"]],
  ["birmingham-soho", ["soho", "handsworth"]],
  ["southall", ["southall"]],
  ["slough", ["slough", "wellington"]],
  ["coventry", ["coventry", "pool meadow"]],
  ["wolverhampton", ["wolverhampton", "faulkland", "faulkand"]],
  ["leicester", ["leicester", "st margaret"]],
];

export function withStopCode(stop: RouteStop): RouteStop {
  if (stop.code) return stop;
  const searchable = `${stop.place} ${stop.detail}`.toLowerCase();
  const match = hints.find(([, values]) => values.some((value) => searchable.includes(value)));
  return { ...stop, code: match?.[0] };
}

export function withRouteStopCodes(route: CoachRoute): CoachRoute {
  return { ...route, stops: route.stops.map(withStopCode) };
}
