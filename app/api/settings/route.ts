import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/apiAuth";
import { SUPPORTED_TIMEZONES } from "@/lib/timezones";
import { cacheDel } from "@/lib/redis";
import { ORG_TIMEZONE_CACHE_KEY } from "@/lib/orgTime";

export async function GET() {
  const { error } = await requireRole(["ADMIN"]);
  if (error) return error;

  const setting = await prisma.setting.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });

  return NextResponse.json(setting);
}

export async function PUT(req: NextRequest) {
  const { error } = await requireRole(["ADMIN"]);
  if (error) return error;

  const body = await req.json();
  const { timezone } = body as { timezone: string };

  if (!SUPPORTED_TIMEZONES.includes(timezone)) {
    return NextResponse.json({ error: "Unsupported timezone" }, { status: 400 });
  }

  const setting = await prisma.setting.upsert({
    where: { id: "singleton" },
    update: { timezone },
    create: { id: "singleton", timezone },
  });
  await cacheDel(ORG_TIMEZONE_CACHE_KEY);

  return NextResponse.json(setting);
}
