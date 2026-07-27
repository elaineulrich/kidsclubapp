import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/apiAuth";

export async function GET() {
  const { error } = await requireRole(["ADMIN"]);
  if (error) return error;

  const drivers = await prisma.driver.findMany({
    include: { vans: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(drivers);
}

export async function POST(req: NextRequest) {
  const { error } = await requireRole(["ADMIN"]);
  if (error) return error;

  const body = await req.json();
  const { name, phone, email, loginCode } = body;

  if (!name || !phone || !loginCode) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const driver = await prisma.driver.create({
    data: { name, phone, email, loginCode: loginCode.trim().toUpperCase() },
  });

  return NextResponse.json(driver, { status: 201 });
}
