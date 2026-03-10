import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

async function findRecord(id: string, orgId?: string | null) {
  return prisma.serviceRecord.findFirst({
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
  const record = await findRecord(id, session.user.organizationId);
  if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(record);
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
  const existing = await findRecord(id, session.user.organizationId);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();

  const record = await prisma.serviceRecord.update({
    where: { id },
    data: {
      type: body.type ?? existing.type,
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

  return NextResponse.json(record);
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
  const existing = await findRecord(id, session.user.organizationId);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.serviceRecord.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
