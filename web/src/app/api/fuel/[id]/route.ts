import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

async function findEntry(id: string, orgId?: string | null) {
  return prisma.fuelEntry.findFirst({
    where: {
      id,
      vehicle: { ...(orgId ? { organizationId: orgId } : {}) },
    },
    include: {
      vehicle: {
        select: { id: true, registrationNumber: true, make: true, model: true },
      },
    },
  });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const entry = await findEntry(id, session.user.organizationId);
  if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(entry);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role;
  if (!["SUPER_ADMIN", "FLEET_ADMIN", "DISPATCHER"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const existing = await findEntry(id, session.user.organizationId);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const odometerKm = Number(body.odometerKm);

  // Recalculate delta vs. previous entry (exclude current)
  const prevEntry = await prisma.fuelEntry.findFirst({
    where: {
      vehicleId: existing.vehicleId,
      id: { not: id },
      date: { lte: new Date(body.date) },
    },
    orderBy: { date: "desc" },
  });

  const deltaKm =
    prevEntry && odometerKm >= prevEntry.odometerKm
      ? odometerKm - prevEntry.odometerKm
      : null;

  const entry = await prisma.fuelEntry.update({
    where: { id },
    data: {
      date: new Date(body.date),
      odometerKm,
      odometerDeltaKm: deltaKm,
      fuelLiters: body.fuelLiters ? Number(body.fuelLiters) : null,
      pricePerLiter: body.pricePerLiter ? Number(body.pricePerLiter) : null,
      totalAmount: body.totalAmount ? Number(body.totalAmount) : null,
      location: body.location || null,
      fuelType: body.fuelType || null,
      notes: body.notes || null,
    },
    include: {
      vehicle: {
        select: { id: true, registrationNumber: true, make: true, model: true },
      },
    },
  });

  return NextResponse.json(entry);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role;
  if (!["SUPER_ADMIN", "FLEET_ADMIN"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const existing = await findEntry(id, session.user.organizationId);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.fuelEntry.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
