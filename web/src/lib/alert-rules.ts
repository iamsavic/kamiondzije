import { prisma } from "./db";
import { ALERT_RULE_TYPES } from "./alert-rule-types";

/** Ensures all rule types exist for the org, creating defaults if missing. Returns all rules. */
export async function ensureAlertRules(organizationId: string) {
  const existing = await prisma.alertRule.findMany({
    where: { organizationId },
  });

  const existingByType = new Map(existing.map((r) => [r.type, r]));
  const toCreate = ALERT_RULE_TYPES.filter((t) => !existingByType.has(t.type));

  if (toCreate.length > 0) {
    await prisma.alertRule.createMany({
      data: toCreate.map((t) => ({
        organizationId,
        name: t.name,
        type: t.type,
        warningDays: t.defaultWarningDays,
        criticalDays: t.defaultCriticalDays,
        isActive: true,
      })),
    });
  }

  return prisma.alertRule.findMany({
    where: { organizationId },
    orderBy: { createdAt: "asc" },
  });
}
