import { prisma } from "@/lib/prisma";
import { getOrSetCache } from "@/lib/redis";

const DEFAULT_TIMEZONE = "America/Chicago";
export const ORG_TIMEZONE_CACHE_KEY = "settings:timezone";

// Read on nearly every request (event classification, driver route lookups, confirm
// routes) and changed only rarely from the admin Settings page, so it's cached with a
// generous TTL; the Settings PUT handler busts this key immediately on change.
export async function getOrgTimezone(): Promise<string> {
  return getOrSetCache(ORG_TIMEZONE_CACHE_KEY, 300, async () => {
    const setting = await prisma.setting.findUnique({ where: { id: "singleton" } });
    return setting?.timezone || DEFAULT_TIMEZONE;
  });
}

function dateStringInTimezone(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

// Classifies eventDate as "current" (same calendar day as `now`), "past", or "upcoming",
// using calendar days as understood in `timeZone` rather than the server process's own
// timezone - otherwise a same-day event can flip to the wrong bucket near midnight UTC.
export function classifyDay(eventDate: Date, timeZone: string, now = new Date()): "past" | "current" | "upcoming" {
  const eventStr = dateStringInTimezone(eventDate, timeZone);
  const todayStr = dateStringInTimezone(now, timeZone);
  if (eventStr === todayStr) return "current";
  return eventStr < todayStr ? "past" : "upcoming";
}

function timezoneOffsetMinutes(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);

  const map: Record<string, string> = {};
  for (const p of parts) map[p.type] = p.value;

  const asUtc = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    Number(map.hour),
    Number(map.minute),
    Number(map.second)
  );

  return (asUtc - date.getTime()) / 60000;
}

// Returns the UTC instant corresponding to midnight of `dateStr` ("YYYY-MM-DD") in `timeZone`.
// Use this (not `new Date(dateStr)`) whenever storing a date picked from a plain <input
// type="date"> - otherwise it's parsed as UTC midnight, which can land on the previous
// calendar day once viewed back in the org's local timezone.
export function zonedMidnightUtc(dateStr: string, timeZone: string): Date {
  const naiveUtc = new Date(`${dateStr}T00:00:00Z`);
  const offsetMinutes = timezoneOffsetMinutes(naiveUtc, timeZone);
  return new Date(naiveUtc.getTime() - offsetMinutes * 60000);
}

// Returns the [start, end) UTC instants for "today" (in `timeZone`), for Prisma date-range queries.
export function todayRangeInTimezone(timeZone: string, now = new Date()): { start: Date; end: Date } {
  const todayStr = dateStringInTimezone(now, timeZone);
  const start = zonedMidnightUtc(todayStr, timeZone);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}
