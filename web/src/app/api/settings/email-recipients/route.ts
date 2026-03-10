import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { alertEmailRecipients: true },
  });

  return NextResponse.json({ emails: org?.alertEmailRecipients ?? [] });
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
  if (!Array.isArray(body?.emails)) {
    return NextResponse.json({ error: "Očekuje se niz email adresa" }, { status: 400 });
  }

  const emails: string[] = body.emails
    .map((e: unknown) => (typeof e === "string" ? e.trim().toLowerCase() : ""))
    .filter(Boolean);

  const invalid = emails.filter((e) => !EMAIL_REGEX.test(e));
  if (invalid.length > 0) {
    return NextResponse.json(
      { error: `Neispravne email adrese: ${invalid.join(", ")}` },
      { status: 400 }
    );
  }

  const unique = [...new Set(emails)];

  const org = await prisma.organization.update({
    where: { id: orgId },
    data: { alertEmailRecipients: unique },
    select: { alertEmailRecipients: true },
  });

  return NextResponse.json({ emails: org.alertEmailRecipients });
}
