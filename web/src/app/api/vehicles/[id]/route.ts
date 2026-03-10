import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

async function getVehicle(id: string, orgId?: string) {
  return prisma.vehicle.findFirst({
    where: { id, ...(orgId ? { organizationId: orgId } : {}) },
    include: {
      documents: { orderBy: { validTo: "asc" } },
      fuelEntries: { orderBy: { date: "desc" }, take: 10 },
      serviceRecords: { orderBy: { sentAt: "desc" } },
      assignments: {
        include: { driver: { select: { id: true, firstName: true, lastName: true } } },
        orderBy: { assignedAt: "desc" },
      },
      alerts: { where: { status: "active" }, orderBy: { createdAt: "desc" } },
      gpsDevice: true,
      travelOrders: {
        orderBy: { departureAt: "desc" },
        take: 5,
        include: { driver: { select: { id: true, firstName: true, lastName: true } } },
      },
    },
  });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const vehicle = await getVehicle(id, session.user.organizationId);
  if (!vehicle) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(vehicle);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role;
  if (!["SUPER_ADMIN", "FLEET_ADMIN"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const orgId = session.user.organizationId;
  const existing = await prisma.vehicle.findFirst({
    where: { id, ...(orgId ? { organizationId: orgId } : {}) },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();

  const vehicle = await prisma.vehicle.update({
    where: { id },
    data: {
      registrationNumber: body.registrationNumber,
      vin: body.vin || null,
      make: body.make,
      model: body.model,
      year: Number(body.year),
      fuelType: body.fuelType || null,
      engineDisplacement: body.engineDisplacement ? Number(body.engineDisplacement) : null,
      powerKw: body.powerKw ? Number(body.powerKw) : null,
      firstRegistration: body.firstRegistration ? new Date(body.firstRegistration) : null,
      status: body.status,
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

  return NextResponse.json(vehicle);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role;
  if (!["SUPER_ADMIN"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const orgId = session.user.organizationId;
  const existing = await prisma.vehicle.findFirst({
    where: { id, ...(orgId ? { organizationId: orgId } : {}) },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Soft delete: set status to sold/archived
  await prisma.vehicle.update({ where: { id }, data: { status: "sold" } });
  return NextResponse.json({ ok: true });
}
