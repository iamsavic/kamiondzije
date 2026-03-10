import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { ensureAlertRules } from "@/lib/alert-rules";

async function resolveOrgId(userId: string, sessionOrgId?: string) {
  if (sessionOrgId) return sessionOrgId;
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { organizationId: true } });
  return u?.organizationId ?? null;
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await resolveOrgId(session.user.id, session.user.organizationId);
  if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const rules = await ensureAlertRules(orgId);
  return NextResponse.json(rules);
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role;
  if (role !== "SUPER_ADMIN" && role !== "FLEET_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const orgId = await resolveOrgId(session.user.id, session.user.organizationId);
  if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const body = await req.json();
  if (!Array.isArray(body)) {
    return NextResponse.json({ error: "Expected array of rules" }, { status: 400 });
  }

  const updates = body as {
    id: string;
    warningDays: number;
    criticalDays: number;
    isActive: boolean;
  }[];

  for (const rule of updates) {
    if (typeof rule.id !== "string") continue;
    if (rule.warningDays < 1 || rule.criticalDays < 1) {
      return NextResponse.json(
        { error: "Broj dana mora biti veći od 0" },
        { status: 400 }
      );
    }
    if (rule.criticalDays >= rule.warningDays) {
      return NextResponse.json(
        { error: "Crveni prag mora biti manji od narandžastog praga" },
        { status: 400 }
      );
    }

    await prisma.alertRule.updateMany({
      where: { id: rule.id, organizationId: orgId },
      data: {
        warningDays: rule.warningDays,
        criticalDays: rule.criticalDays,
        isActive: rule.isActive,
      },
    });
  }

  const rules = await prisma.alertRule.findMany({
    where: { organizationId: orgId },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(rules);
}
