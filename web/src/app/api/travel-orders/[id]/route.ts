import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

async function findOrder(id: string, orgId?: string | null) {
  return prisma.travelOrder.findFirst({
    where: { id, ...(orgId ? { organizationId: orgId } : {}) },
    include: {
      driver: { select: { id: true, firstName: true, lastName: true } },
      vehicle: { select: { id: true, registrationNumber: true, make: true, model: true, status: true } },
      expenses: true,
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
  const order = await findOrder(id, session.user.organizationId);
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(order);
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
  const existing = await findOrder(id, session.user.organizationId);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (["completed", "cancelled"].includes(existing.status)) {
    return NextResponse.json(
      { error: "Nije moguće menjati završen ili otkazan nalog." },
      { status: 422 }
    );
  }

  const body = await req.json();

  // Business rule: end odometer >= start
  if (body.startOdometer && body.endOdometer) {
    if (Number(body.endOdometer) < Number(body.startOdometer)) {
      return NextResponse.json(
        { error: "Završna kilometraža ne sme biti manja od početne." },
        { status: 422 }
      );
    }
  }

  const startOdometer = body.startOdometer ? Number(body.startOdometer) : null;
  const endOdometer = body.endOdometer ? Number(body.endOdometer) : null;
  const distanceKm =
    startOdometer && endOdometer && endOdometer >= startOdometer
      ? endOdometer - startOdometer
      : null;

  // Replace expenses
  const order = await prisma.$transaction(async (tx) => {
    await tx.travelOrderExpense.deleteMany({ where: { travelOrderId: id } });

    return tx.travelOrder.update({
      where: { id },
      data: {
        driverId: body.driverId ?? existing.driverId,
        vehicleId: body.vehicleId ?? existing.vehicleId,
        route: body.route || null,
        purpose: body.purpose || null,
        departureAt: body.departureAt ? new Date(body.departureAt) : null,
        returnAt: body.returnAt ? new Date(body.returnAt) : null,
        startOdometer,
        endOdometer,
        distanceKm,
        fuelUsed: body.fuelUsed ? Number(body.fuelUsed) : null,
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
        vehicle: { select: { id: true, registrationNumber: true, make: true, model: true, status: true } },
        expenses: true,
      },
    });
  });

  return NextResponse.json(order);
}

// Status transition only (approve, complete, cancel)
export async function PATCH(
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
  const existing = await findOrder(id, session.user.organizationId);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const newStatus = body.status as string;

  const allowed: Record<string, string[]> = {
    draft: ["approved", "cancelled"],
    approved: ["completed", "cancelled"],
    completed: [],
    cancelled: [],
  };

  if (!allowed[existing.status]?.includes(newStatus)) {
    return NextResponse.json(
      { error: `Prelaz iz "${existing.status}" u "${newStatus}" nije dozvoljen.` },
      { status: 422 }
    );
  }

  // Patch endOdometer/distanceKm when completing
  const extraData: Record<string, unknown> = {};
  if (newStatus === "completed" && body.endOdometer) {
    const end = Number(body.endOdometer);
    extraData.endOdometer = end;
    if (existing.startOdometer && end >= existing.startOdometer) {
      extraData.distanceKm = end - existing.startOdometer;
    }
  }

  const order = await prisma.travelOrder.update({
    where: { id },
    data: { status: newStatus, ...extraData },
    include: {
      driver: { select: { id: true, firstName: true, lastName: true } },
      vehicle: { select: { id: true, registrationNumber: true, make: true, model: true, status: true } },
      expenses: true,
    },
  });

  return NextResponse.json(order);
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
  const existing = await findOrder(id, session.user.organizationId);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (existing.status === "completed") {
    return NextResponse.json(
      { error: "Nije moguće obrisati završen nalog." },
      { status: 422 }
    );
  }

  await prisma.travelOrder.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
