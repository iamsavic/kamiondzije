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

  const drivers = await prisma.driver.findMany({
    where: {
      ...(orgId ? { organizationId: orgId } : {}),
      ...(status ? { employmentStatus: status } : {}),
      ...(search
        ? {
            OR: [
              { firstName: { contains: search, mode: "insensitive" } },
              { lastName: { contains: search, mode: "insensitive" } },
              { licenseNumber: { contains: search, mode: "insensitive" } },
              { phone: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: {
      assignments: {
        where: { status: "active", type: "vehicle" },
        include: { vehicle: { select: { id: true, registrationNumber: true, make: true, model: true } } },
        take: 1,
      },
      _count: { select: { alerts: { where: { status: "active" } } } },
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  return NextResponse.json(drivers);
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

  const driver = await prisma.driver.create({
    data: {
      organizationId: orgId,
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

  return NextResponse.json(driver, { status: 201 });
}
