import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role;
  if (!["SUPER_ADMIN", "FLEET_ADMIN"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const orgId = session.user.organizationId;

  const vehicle = await prisma.vehicle.findFirst({
    where: { id, ...(orgId ? { organizationId: orgId } : {}) },
  });
  if (!vehicle) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const doc = await prisma.vehicleDocument.create({
    data: {
      vehicleId: id,
      type: body.type,
      documentNumber: body.documentNumber || null,
      validFrom: body.validFrom ? new Date(body.validFrom) : null,
      validTo: body.validTo ? new Date(body.validTo) : null,
      notes: body.notes || null,
    },
  });

  return NextResponse.json(doc, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role;
  if (!["SUPER_ADMIN", "FLEET_ADMIN"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: vehicleId } = await params;
  const { searchParams } = new URL(req.url);
  const docId = searchParams.get("docId");
  if (!docId) return NextResponse.json({ error: "docId required" }, { status: 400 });

  await prisma.vehicleDocument.delete({ where: { id: docId, vehicleId } });
  return NextResponse.json({ ok: true });
}
