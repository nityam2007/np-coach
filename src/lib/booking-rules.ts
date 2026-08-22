import type { CoachRoute } from "@/lib/site-config";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_ADVANCE_DAYS = 180;

function londonDate(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function londonMinutes(now: Date): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? 0);
  return hour * 60 + minute;
}

function departureMinutes(value: string): number | null {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;
  let hour = Number(match[1]) % 12;
  if (match[3].toUpperCase() === "PM") hour += 12;
  return hour * 60 + Number(match[2]);
}

function operatesOn(route: CoachRoute, date: string): boolean {
  const day = new Date(`${date}T12:00:00Z`).getUTCDay();
  return !/friday\s+(?:to|–|-)\s+monday/i.test(route.days) || [0, 1, 5, 6].includes(day);
}

export interface JourneyMatch {
  route: CoachRoute;
  departureTime: string;
}

export function findJourney(
  routes: CoachRoute[],
  fromCode: string,
  toCode: string,
  date: string,
  now = new Date(),
): JourneyMatch | null {
  if (!DATE_RE.test(date)) return null;
  const today = londonDate(now);
  const max = new Date(`${today}T12:00:00Z`);
  max.setUTCDate(max.getUTCDate() + MAX_ADVANCE_DAYS);
  if (date < today || date > max.toISOString().slice(0, 10)) return null;

  for (const route of routes) {
    const fromIndex = route.stops.findIndex((stop) => stop.code === fromCode);
    const toIndex = route.stops.findIndex((stop) => stop.code === toCode);
    if (fromIndex < 0 || toIndex <= fromIndex || !operatesOn(route, date)) continue;
    const departure = route.stops[fromIndex].time;
    const minutes = departureMinutes(departure);
    if (minutes === null) continue;
    if (date === today && minutes < londonMinutes(now) + 60) continue;
    return { route, departureTime: departure };
  }
  return null;
}
