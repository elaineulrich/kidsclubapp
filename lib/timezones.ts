// A conservative list of IANA timezones covering the continental US and a few
// common others - enough for a church/org picking "where we are", without
// pulling in a full timezone database dependency. Kept in its own module
// (rather than lib/orgTime.ts) so it can be imported from client components
// without pulling in the Prisma client.
export const SUPPORTED_TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Phoenix",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
  "UTC",
];
