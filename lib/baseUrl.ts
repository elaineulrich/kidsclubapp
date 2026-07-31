import { NextRequest } from "next/server";

// Prefers the domain the request actually arrived on (so generated links work
// correctly whether visited via a custom domain or the platform's default
// subdomain), falling back to NEXTAUTH_URL when there's no request host to read.
export function getBaseUrl(req: NextRequest): string {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (host) {
    const proto = req.headers.get("x-forwarded-proto") ?? "https";
    return `${proto}://${host}`;
  }
  return process.env.NEXTAUTH_URL?.replace(/\/$/, "") ?? "";
}
