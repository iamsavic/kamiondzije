import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const orgId = session.user.organizationId;

  const existing = await prisma.alert.findFirst({
    where: {
      id,
      ...(orgId
        ? {
            OR: [
              { vehicle: { organizationId: orgId } },
              { driver: { organizationId: orgId } },
            ],
          }
        : {}),
    },
  });

  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const newStatus = body.status as "resolved" | "ignored";

  if (!["resolved", "ignored"].includes(newStatus)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const updated = await prisma.alert.update({
    where: { id },
    data: {
      status: newStatus,
      resolvedAt: new Date(),
      resolvedBy: session.user.name ?? session.user.email ?? "unknown",
    },
  });

  return NextResponse.json(updated);
}
