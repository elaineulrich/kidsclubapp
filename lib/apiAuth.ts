import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import type { AppRole } from "@/types/next-auth";

export async function requireRole(roles: AppRole[]) {
  const session = await getServerSession(authOptions);
  if (!session || !roles.includes(session.user.role)) {
    return { session: null, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { session, error: null };
}
