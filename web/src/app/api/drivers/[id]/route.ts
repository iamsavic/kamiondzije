import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const orgId = session.user.organizationId;

  const driver = await prisma.driver.findFirst({
    where: { id, ...(orgId ? { organizationId: orgId } : {}) },
    include: {
      documents: { orderBy: { type: "asc" } },
      assignments: {
        orderBy: { assignedAt: "desc" },
        include: {
          vehicle: {
            select: { id: true, registrationNumber: true, make: true, model: true, status: true },
          },
        },
      },
      travelOrders: {
        orderBy: { departureAt: "desc" },
        take: 5,
        include: { vehicle: { select: { id: true, registrationNumber: true } } },
      },
      alerts: { where: { status: "active" }, orderBy: { createdAt: "desc" } },
    },
  });

  if (!driver) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(driver);
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
  const existing = await prisma.driver.findFirst({
    where: { id, ...(orgId ? { organizationId: orgId } : {}) },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();

  const driver = await prisma.driver.update({
    where: { id },
    data: {
      externalId: body.externalId || null,
      firstName: body.firstName,
      lastName: body.lastName,
      phone: body.phone || null,
      email: body.email || null,
      address: body.address || null,
      jobTitle: body.jobTitle || null,
      employmentStartDate: body.employmentStartDate ? new Date(body.employmentStartDate) : null,
      employmentStatus: body.employmentStatus || "active",
      licenseNumber: body.licenseNumber || null,
      licenseCategories: body.licenseCategories || null,
      licenseExpiry: body.licenseExpiry ? new Date(body.licenseExpiry) : null,
      idCardNumber: body.idCardNumber || null,
      idCardExpiry: body.idCardExpiry ? new Date(body.idCardExpiry) : null,
      notes: body.notes || null,
    },
  });

  return NextResponse.json(driver);
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
  const existing = await prisma.driver.findFirst({
    where: { id, ...(orgId ? { organizationId: orgId } : {}) },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.driver.update({ where: { id }, data: { employmentStatus: "terminated" } });
  return NextResponse.json({ ok: true });
}
