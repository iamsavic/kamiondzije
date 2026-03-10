import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = session.user.organizationId;
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const search = searchParams.get("search");

  const vehicles = await prisma.vehicle.findMany({
    where: {
      ...(orgId ? { organizationId: orgId } : {}),
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { registrationNumber: { contains: search, mode: "insensitive" } },
              { make: { contains: search, mode: "insensitive" } },
              { model: { contains: search, mode: "insensitive" } },
              { vin: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: {
      documents: {
        orderBy: { validTo: "asc" },
      },
      assignments: {
        where: { status: "active" },
        include: { driver: { select: { id: true, firstName: true, lastName: true } } },
      },
      _count: { select: { alerts: { where: { status: "active" } } } },
    },
    orderBy: { registrationNumber: "asc" },
  });

  return NextResponse.json(vehicles);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role;
  if (!["SUPER_ADMIN", "FLEET_ADMIN"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const orgId = session.user.organizationId;
  if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const body = await req.json();

  const vehicle = await prisma.vehicle.create({
    data: {
      organizationId: orgId,
      registrationNumber: body.registrationNumber,
      vin: body.vin || null,
      make: body.make,
      model: body.model,
      year: Number(body.year),
      fuelType: body.fuelType || null,
      engineDisplacement: body.engineDisplacement ? Number(body.engineDisplacement) : null,
      powerKw: body.powerKw ? Number(body.powerKw) : null,
      firstRegistration: body.firstRegistration ? new Date(body.firstRegistration) : null,
      status: body.status || "active",
      purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : null,
      purchasePrice: body.purchasePrice ? Number(body.purchasePrice) : null,
      currentValue: body.currentValue ? Number(body.currentValue) : null,
      acquisitionType: body.acquisitionType || null,
      leasingCompany: body.leasingCompany || null,
      leasingContractNo: body.leasingContractNo || null,
      leasingStart: body.leasingStart ? new Date(body.leasingStart) : null,
      leasingEnd: body.leasingEnd ? new Date(body.leasingEnd) : null,
      leasingMonthly: body.leasingMonthly ? Number(body.leasingMonthly) : null,
      notes: body.notes || null,
    },
  });

  return NextResponse.json(vehicle, { status: 201 });
}
