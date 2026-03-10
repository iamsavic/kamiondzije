import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = session.user.organizationId;
  const { searchParams } = new URL(req.url);
  const vehicleId = searchParams.get("vehicleId");
  const type = searchParams.get("type");
  const search = searchParams.get("search");

  const records = await prisma.serviceRecord.findMany({
    where: {
      vehicle: {
        ...(orgId ? { organizationId: orgId } : {}),
      },
      ...(vehicleId ? { vehicleId } : {}),
      ...(type ? { type } : {}),
      ...(search
        ? {
            OR: [
              { description: { contains: search, mode: "insensitive" } },
              { workshop: { contains: search, mode: "insensitive" } },
              { invoiceNumber: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: {
      vehicle: {
        select: { id: true, registrationNumber: true, make: true, model: true },
      },
    },
    orderBy: [{ sentAt: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json(records);
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

  const record = await prisma.serviceRecord.create({
    data: {
      vehicleId: body.vehicleId,
      type: body.type ?? "routine",
      sentAt: body.sentAt ? new Date(body.sentAt) : null,
      completedAt: body.completedAt ? new Date(body.completedAt) : null,
      description: body.description || null,
      workshop: body.workshop || null,
      invoiceAmount: body.invoiceAmount ? Number(body.invoiceAmount) : null,
      invoiceNumber: body.invoiceNumber || null,
      nextServiceKm: body.nextServiceKm ? Number(body.nextServiceKm) : null,
      nextServiceDate: body.nextServiceDate ? new Date(body.nextServiceDate) : null,
      notes: body.notes || null,
    },
    include: {
      vehicle: {
        select: { id: true, registrationNumber: true, make: true, model: true },
      },
    },
  });

  return NextResponse.json(record, { status: 201 });
}
