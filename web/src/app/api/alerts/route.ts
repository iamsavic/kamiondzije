import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = session.user.organizationId;
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "active";
  const level = searchParams.get("level");
  const type = searchParams.get("type");

  const orgFilter = orgId
    ? {
        OR: [
          { vehicle: { organizationId: orgId } },
          { driver: { organizationId: orgId } },
        ],
      }
    : {};

  const alerts = await prisma.alert.findMany({
    where: {
      ...orgFilter,
      status,
      ...(level ? { level } : {}),
      ...(type ? { type } : {}),
    },
    include: {
      vehicle: {
        select: { id: true, registrationNumber: true, make: true, model: true },
      },
      driver: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
    orderBy: [
      { level: "asc" }, // expired first (alphabetically: critical < expired < warning)
      { createdAt: "desc" },
    ],
  });

  // Sort manually: expired → critical → warning
  const levelOrder: Record<string, number> = { expired: 0, critical: 1, warning: 2 };
  alerts.sort((a, b) => (levelOrder[a.level] ?? 9) - (levelOrder[b.level] ?? 9));

  return NextResponse.json(alerts);
}
