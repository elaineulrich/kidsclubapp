import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/apiAuth";

export async function GET() {
  const { error } = await requireRole(["ADMIN"]);
  if (error) return error;

  const vans = await prisma.van.findMany({
    include: { driver: true },
    orderBy: { vanName: "asc" },
  });

  return NextResponse.json(vans);
}

export async function POST(req: NextRequest) {
  const { error } = await requireRole(["ADMIN"]);
  if (error) return error;

  const body = await req.json();
  const { vanName, driverId, capacity } = body;

  if (!vanName) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const van = await prisma.van.create({
    data: { vanName, driverId: driverId || null, capacity: capacity ? Number(capacity) : 10 },
  });

  return NextResponse.json(van, { status: 201 });
}
