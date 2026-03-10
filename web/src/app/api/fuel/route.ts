import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = session.user.organizationId;
  const { searchParams } = new URL(req.url);
  const vehicleId = searchParams.get("vehicleId");
  const search = searchParams.get("search");

  const entries = await prisma.fuelEntry.findMany({
    where: {
      vehicle: { ...(orgId ? { organizationId: orgId } : {}) },
      ...(vehicleId ? { vehicleId } : {}),
      ...(search
        ? {
            OR: [
              { location: { contains: search, mode: "insensitive" } },
              { notes: { contains: search, mode: "insensitive" } },
              { vehicle: { registrationNumber: { contains: search, mode: "insensitive" } } },
              { vehicle: { make: { contains: search, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    include: {
      vehicle: {
        select: { id: true, registrationNumber: true, make: true, model: true },
      },
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json(entries);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role;
  if (!["SUPER_ADMIN", "FLEET_ADMIN", "DISPATCHER"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const orgId = session.user.organizationId;
  const body = await req.json();

  // Verify vehicle belongs to org
  const vehicle = await prisma.vehicle.findFirst({
    where: { id: body.vehicleId, ...(orgId ? { organizationId: orgId } : {}) },
  });
  if (!vehicle) return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });

  // Business rule: odometer cannot go backward
  const lastEntry = await prisma.fuelEntry.findFirst({
    where: { vehicleId: body.vehicleId },
    orderBy: { date: "desc" },
  });

  const odometerKm = Number(body.odometerKm);
  if (lastEntry && odometerKm < lastEntry.odometerKm) {
    return NextResponse.json(
      {
        error: `Kilometraža ne sme biti manja od prethodnog unosa (${lastEntry.odometerKm.toLocaleString("sr-RS")} km).`,
      },
      { status: 422 }
    );
  }

  const deltaKm =
    lastEntry && odometerKm >= lastEntry.odometerKm
      ? odometerKm - lastEntry.odometerKm
      : null;

  const entry = await prisma.fuelEntry.create({
    data: {
      vehicleId: body.vehicleId,
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

  return NextResponse.json(entry, { status: 201 });
}
