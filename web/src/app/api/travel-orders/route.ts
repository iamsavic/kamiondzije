import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = session.user.organizationId;
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const driverId = searchParams.get("driverId");
  const vehicleId = searchParams.get("vehicleId");
  const search = searchParams.get("search");

  const orders = await prisma.travelOrder.findMany({
    where: {
      ...(orgId ? { organizationId: orgId } : {}),
      ...(status ? { status } : {}),
      ...(driverId ? { driverId } : {}),
      ...(vehicleId ? { vehicleId } : {}),
      ...(search
        ? {
            OR: [
              { orderNumber: { contains: search, mode: "insensitive" } },
              { route: { contains: search, mode: "insensitive" } },
              { purpose: { contains: search, mode: "insensitive" } },
              { driver: { firstName: { contains: search, mode: "insensitive" } } },
              { driver: { lastName: { contains: search, mode: "insensitive" } } },
              { vehicle: { registrationNumber: { contains: search, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    include: {
      driver: { select: { id: true, firstName: true, lastName: true } },
      vehicle: { select: { id: true, registrationNumber: true, make: true, model: true } },
      expenses: true,
    },
    orderBy: [{ departureAt: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json(orders);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role;
  if (!["SUPER_ADMIN", "FLEET_ADMIN", "DISPATCHER"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const orgId = session.user.organizationId;
  if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const body = await req.json();

  // Business rule: vehicle must be active
  const vehicle = await prisma.vehicle.findFirst({
    where: { id: body.vehicleId, organizationId: orgId },
  });
  if (!vehicle) return NextResponse.json({ error: "Vozilo nije pronađeno." }, { status: 404 });
  if (vehicle.status !== "active") {
    return NextResponse.json(
      { error: "Nije moguće kreirati putni nalog za neaktivno vozilo." },
      { status: 422 }
    );
  }

  // Verify driver belongs to org
  const driver = await prisma.driver.findFirst({
    where: { id: body.driverId, organizationId: orgId },
  });
  if (!driver) return NextResponse.json({ error: "Vozač nije pronađen." }, { status: 404 });

  // Business rule: end odometer >= start odometer
  if (body.startOdometer && body.endOdometer) {
    if (Number(body.endOdometer) < Number(body.startOdometer)) {
      return NextResponse.json(
        { error: "Završna kilometraža ne sme biti manja od početne." },
        { status: 422 }
      );
    }
  }

  // Generate order number: PN-YYYYMMDD-XXX
  const today = new Date();
  const prefix = `PN-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;
  const count = await prisma.travelOrder.count({
    where: { organizationId: orgId, orderNumber: { startsWith: prefix } },
  });
  const orderNumber = `${prefix}-${String(count + 1).padStart(3, "0")}`;

  const startOdometer = body.startOdometer ? Number(body.startOdometer) : null;
  const endOdometer = body.endOdometer ? Number(body.endOdometer) : null;
  const distanceKm =
    startOdometer && endOdometer && endOdometer >= startOdometer
      ? endOdometer - startOdometer
      : null;

  const order = await prisma.travelOrder.create({
    data: {
      organizationId: orgId,
      orderNumber,
      driverId: body.driverId,
      vehicleId: body.vehicleId,
      route: body.route || null,
      purpose: body.purpose || null,
      departureAt: body.departureAt ? new Date(body.departureAt) : null,
      returnAt: body.returnAt ? new Date(body.returnAt) : null,
      startOdometer,
      endOdometer,
      distanceKm,
      fuelUsed: body.fuelUsed ? Number(body.fuelUsed) : null,
      status: "draft",
      notes: body.notes || null,
      expenses: body.expenses?.length
        ? {
            create: body.expenses.map((ex: { description: string; amount: string; currency?: string }) => ({
              description: ex.description,
              amount: Number(ex.amount),
              currency: ex.currency ?? "RSD",
            })),
          }
        : undefined,
    },
    include: {
      driver: { select: { id: true, firstName: true, lastName: true } },
      vehicle: { select: { id: true, registrationNumber: true, make: true, model: true } },
      expenses: true,
    },
  });

  return NextResponse.json(order, { status: 201 });
}
