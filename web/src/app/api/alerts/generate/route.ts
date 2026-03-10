import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { generateAlertsForOrg, generateAlertsForAllOrgs } from "@/lib/alert-generator";

// Called by cron (Vercel Cron, external scheduler) or manually by Super Admin.
// Vercel Cron sends Authorization: Bearer <CRON_SECRET>.
export async function POST(req: NextRequest) {
  // Allow cron secret (server-to-server)
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  const isCron = cronSecret && authHeader === `Bearer ${cronSecret}`;

  // Or logged-in Super Admin
  let isAdmin = false;
  if (!isCron) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    isAdmin = ["SUPER_ADMIN", "FLEET_ADMIN"].includes(session.user.role);
    if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    if (isCron) {
      await generateAlertsForAllOrgs();
      return NextResponse.json({ ok: true, scope: "all" });
    }

    const session = await auth();
    const orgId = session?.user?.organizationId;
    if (!orgId) {
      // Super Admin without org → all
      await generateAlertsForAllOrgs();
      return NextResponse.json({ ok: true, scope: "all" });
    }

      const result = await generateAlertsForOrg(orgId, { sendDigest: false });
      return NextResponse.json({ ok: true, scope: "org", ...result });
  } catch (err) {
    console.error("[alerts/generate]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
