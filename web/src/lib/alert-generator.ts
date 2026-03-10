import { prisma } from "./db";
import { sendMail, isEmailConfigured } from "./email";
import { buildAlertEmail, buildDigestEmail, type DigestAlertItem } from "./email-templates";

export type AlertLevel = "warning" | "critical" | "expired";

const DEFAULT_WARNING_DAYS = 30;
const DEFAULT_CRITICAL_DAYS = 5;

// How many hours must pass before re-sending email for the same alert
const EMAIL_RESEND_HOURS = 24;

type RuleThresholds = { warningDays: number; criticalDays: number; isActive: boolean };
type OrgRules = Record<string, RuleThresholds>;

async function loadOrgRules(organizationId: string): Promise<OrgRules> {
  const rules = await prisma.alertRule.findMany({ where: { organizationId } });
  const map: OrgRules = {};
  for (const r of rules) {
    map[r.type] = { warningDays: r.warningDays, criticalDays: r.criticalDays, isActive: r.isActive };
  }
  return map;
}

function getThresholds(
  rules: OrgRules,
  type: string,
  fallbackWarning = DEFAULT_WARNING_DAYS,
  fallbackCritical = DEFAULT_CRITICAL_DAYS
): { warningDays: number; criticalDays: number; active: boolean } {
  const r = rules[type];
  if (!r) return { warningDays: fallbackWarning, criticalDays: fallbackCritical, active: true };
  return { warningDays: r.warningDays, criticalDays: r.criticalDays, active: r.isActive };
}

function getDaysUntil(date: Date): number {
  return Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function getLevel(
  daysLeft: number,
  warningDays = DEFAULT_WARNING_DAYS,
  criticalDays = DEFAULT_CRITICAL_DAYS
): AlertLevel | null {
  if (daysLeft < 0) return "expired";
  if (daysLeft <= criticalDays) return "critical";
  if (daysLeft <= warningDays) return "warning";
  return null;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("sr-Latn-RS");
}

// Returns the alert id if email should be sent (new alert or level escalated or resend due)
function shouldSendEmail(
  existing: {
    emailSentAt: Date | null;
    emailSentLevel: string | null;
  } | null,
  newLevel: AlertLevel
): boolean {
  if (!isEmailConfigured()) return false;

  if (!existing) return true; // new alert

  // Level escalated: warning → critical → expired
  const levelOrder: Record<string, number> = { warning: 0, critical: 1, expired: 2 };
  const prevOrder = levelOrder[existing.emailSentLevel ?? ""] ?? -1;
  const newOrder = levelOrder[newLevel] ?? -1;
  if (newOrder > prevOrder) return true; // escalation

  // Resend if last email was sent more than EMAIL_RESEND_HOURS ago
  if (!existing.emailSentAt) return true;
  const hoursSince =
    (Date.now() - existing.emailSentAt.getTime()) / (1000 * 60 * 60);
  return hoursSince >= EMAIL_RESEND_HOURS;
}

type UpsertResult = {
  alertId: string;
  isNew: boolean;
  levelEscalated: boolean;
  sendEmail: boolean;
  level: AlertLevel;
  title: string;
  message?: string;
};

async function upsertAlert(params: {
  vehicleId?: string;
  driverId?: string;
  type: string;
  level: AlertLevel;
  title: string;
  message?: string;
  entityType: string;
  entityId: string;
}): Promise<UpsertResult> {
  const existing = await prisma.alert.findFirst({
    where: {
      entityType: params.entityType,
      entityId: params.entityId,
      type: params.type,
      status: "active",
    },
  });

  const sendEmail = shouldSendEmail(existing, params.level);

  if (existing) {
    const levelChanged = existing.level !== params.level;
    const levelOrder: Record<string, number> = { warning: 0, critical: 1, expired: 2 };
    const levelEscalated =
      (levelOrder[params.level] ?? 0) > (levelOrder[existing.level] ?? 0);

    if (levelChanged || existing.title !== params.title) {
      await prisma.alert.update({
        where: { id: existing.id },
        data: { level: params.level, title: params.title, message: params.message },
      });
    }

    return {
      alertId: existing.id,
      isNew: false,
      levelEscalated,
      sendEmail,
      level: params.level,
      title: params.title,
      message: params.message,
    };
  } else {
    const created = await prisma.alert.create({
      data: {
        vehicleId: params.vehicleId,
        driverId: params.driverId,
        type: params.type,
        level: params.level,
        title: params.title,
        message: params.message,
        entityType: params.entityType,
        entityId: params.entityId,
        status: "active",
      },
    });

    return {
      alertId: created.id,
      isNew: true,
      levelEscalated: false,
      sendEmail,
      level: params.level,
      title: params.title,
      message: params.message,
    };
  }
}

async function markEmailSent(alertId: string, level: AlertLevel) {
  await prisma.alert.update({
    where: { id: alertId },
    data: { emailSentAt: new Date(), emailSentLevel: level },
  });
}

async function resolveIfOk(entityType: string, entityId: string, type: string) {
  await prisma.alert.updateMany({
    where: { entityType, entityId, type, status: "active" },
    data: { status: "resolved", resolvedAt: new Date() },
  });
}

const DOC_TYPE_LABELS: Record<string, string> = {
  registration: "Registracija",
  insurance: "Osiguranje",
  green_card: "Zeleni karton",
  yellow_card: "Žuti karton",
  lpg_cert: "Atest za plin",
  other: "Dokument",
};

export async function generateAlertsForOrg(
  organizationId: string,
  opts: { sendDigest?: boolean } = {}
): Promise<{
  vehicle_docs: number;
  driver_docs: number;
  services: number;
  emails_sent: number;
}> {
  let vehicleDocCount = 0;
  let driverDocCount = 0;
  let serviceCount = 0;
  let emailsSent = 0;

  const dashboardUrl =
    (process.env.NEXTAUTH_URL ?? process.env.APP_URL ?? "http://localhost:3000") +
    "/dashboard/alerts";

  // Load per-org alert rule thresholds from DB
  const orgRules = await loadOrgRules(organizationId);

  // Collect all alerts needing email for optional digest
  const digestItems: DigestAlertItem[] = [];
  const alertsNeedingEmail: UpsertResult[] = [];

  // 1. Vehicle document expiry
  const vehicleDocRule = getThresholds(orgRules, "vehicle_doc_expiry");
  if (vehicleDocRule.active) {
    const vehicleDocs = await prisma.vehicleDocument.findMany({
      where: { vehicle: { organizationId } },
      include: {
        vehicle: {
          select: { id: true, registrationNumber: true, make: true, model: true },
        },
      },
    });

    for (const doc of vehicleDocs) {
      if (!doc.validTo) continue;
      const daysLeft = getDaysUntil(doc.validTo);
      const level = getLevel(daysLeft, vehicleDocRule.warningDays, vehicleDocRule.criticalDays);
      const docLabel = DOC_TYPE_LABELS[doc.type] ?? "Dokument";
      const vehicleLabel = `${doc.vehicle.registrationNumber} (${doc.vehicle.make} ${doc.vehicle.model})`;

      if (level) {
        const msg =
          daysLeft < 0
            ? `${docLabel} je istekao pre ${Math.abs(daysLeft)} dana.`
            : `${docLabel} ističe za ${daysLeft} dana (${formatDate(doc.validTo)}).`;
        const result = await upsertAlert({
          vehicleId: doc.vehicleId,
          type: "vehicle_doc_expiry",
          level,
          title: `${docLabel} ističe — ${vehicleLabel}`,
          message: msg,
          entityType: "vehicle_document",
          entityId: doc.id,
        });
        if (result.sendEmail) alertsNeedingEmail.push(result);
        vehicleDocCount++;
      } else {
        await resolveIfOk("vehicle_document", doc.id, "vehicle_doc_expiry");
      }
    }
  }

  // 2. Driver license & ID card expiry (active drivers only)
  const licenseRule = getThresholds(orgRules, "driver_license_expiry");
  const idCardRule = getThresholds(orgRules, "driver_idcard_expiry");
  const needDriverCheck = licenseRule.active || idCardRule.active;

  if (needDriverCheck) {
    const drivers = await prisma.driver.findMany({
      where: { organizationId, employmentStatus: "active" },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        licenseExpiry: true,
        idCardExpiry: true,
      },
    });

    for (const driver of drivers) {
      const driverLabel = `${driver.firstName} ${driver.lastName}`;

      if (licenseRule.active && driver.licenseExpiry) {
        const daysLeft = getDaysUntil(driver.licenseExpiry);
        const level = getLevel(daysLeft, licenseRule.warningDays, licenseRule.criticalDays);
        if (level) {
          const msg =
            daysLeft < 0
              ? `Vozačka dozvola istekla pre ${Math.abs(daysLeft)} dana.`
              : `Vozačka dozvola ističe za ${daysLeft} dana (${formatDate(driver.licenseExpiry)}).`;
          const result = await upsertAlert({
            driverId: driver.id,
            type: "driver_license_expiry",
            level,
            title: `Vozačka dozvola ističe — ${driverLabel}`,
            message: msg,
            entityType: "driver",
            entityId: `${driver.id}:license`,
          });
          if (result.sendEmail) alertsNeedingEmail.push(result);
          driverDocCount++;
        } else {
          await resolveIfOk("driver", `${driver.id}:license`, "driver_license_expiry");
        }
      }

      if (idCardRule.active && driver.idCardExpiry) {
        const daysLeft = getDaysUntil(driver.idCardExpiry);
        const level = getLevel(daysLeft, idCardRule.warningDays, idCardRule.criticalDays);
        if (level) {
          const msg =
            daysLeft < 0
              ? `Lična karta istekla pre ${Math.abs(daysLeft)} dana.`
              : `Lična karta ističe za ${daysLeft} dana (${formatDate(driver.idCardExpiry)}).`;
          const result = await upsertAlert({
            driverId: driver.id,
            type: "driver_idcard_expiry",
            level,
            title: `Lična karta ističe — ${driverLabel}`,
            message: msg,
            entityType: "driver",
            entityId: `${driver.id}:idcard`,
          });
          if (result.sendEmail) alertsNeedingEmail.push(result);
          driverDocCount++;
        } else {
          await resolveIfOk("driver", `${driver.id}:idcard`, "driver_idcard_expiry");
        }
      }
    }
  }

  // 3. Service due by date
  const serviceRule = getThresholds(orgRules, "service_due_date", 30, 7);
  if (serviceRule.active) {
    const serviceRecords = await prisma.serviceRecord.findMany({
      where: {
        vehicle: { organizationId },
        nextServiceDate: { not: null },
      },
      include: {
        vehicle: {
          select: { id: true, registrationNumber: true, make: true, model: true },
        },
      },
      orderBy: { nextServiceDate: "desc" },
    });

    const latestByVehicle = new Map<string, (typeof serviceRecords)[0]>();
    for (const sr of serviceRecords) {
      if (!latestByVehicle.has(sr.vehicleId)) {
        latestByVehicle.set(sr.vehicleId, sr);
      }
    }

    for (const sr of latestByVehicle.values()) {
      if (!sr.nextServiceDate) continue;
      const daysLeft = getDaysUntil(sr.nextServiceDate);
      const level = getLevel(daysLeft, serviceRule.warningDays, serviceRule.criticalDays);
      const vehicleLabel = `${sr.vehicle.registrationNumber} (${sr.vehicle.make} ${sr.vehicle.model})`;

      if (level) {
        const msg =
          daysLeft < 0
            ? `Preporučeni servis je prošao pre ${Math.abs(daysLeft)} dana.`
            : `Preporučeni servis za ${daysLeft} dana (${formatDate(sr.nextServiceDate)}).`;
        const result = await upsertAlert({
          vehicleId: sr.vehicleId,
          type: "service_due_date",
          level,
          title: `Servis se bliži — ${vehicleLabel}`,
          message: msg,
          entityType: "service_record",
          entityId: sr.id,
        });
        if (result.sendEmail) alertsNeedingEmail.push(result);
        serviceCount++;
      } else {
        await resolveIfOk("service_record", sr.id, "service_due_date");
      }
    }
  }

  // === Send emails ===
  if (alertsNeedingEmail.length > 0 && isEmailConfigured()) {
    const recipients = await getOrgEmailRecipients(organizationId);

    if (recipients.length > 0) {
      if (opts.sendDigest && alertsNeedingEmail.length > 1) {
        // Send one digest email with all alerts
        alertsNeedingEmail.forEach((a) =>
          digestItems.push({ level: a.level, title: a.title, message: a.message })
        );
        const { subject, html, text } = buildDigestEmail(digestItems, dashboardUrl);
        const sent = await sendMail({ to: recipients, subject, html, text });
        if (sent) {
          emailsSent++;
          // Mark all as sent
          for (const a of alertsNeedingEmail) {
            await markEmailSent(a.alertId, a.level);
          }
        }
      } else {
        // Send individual email per alert
        for (const a of alertsNeedingEmail) {
          const { subject, html, text } = buildAlertEmail({
            title: a.title,
            message: a.message,
            level: a.level,
            dashboardUrl,
          });
          const sent = await sendMail({ to: recipients, subject, html, text });
          if (sent) {
            emailsSent++;
            await markEmailSent(a.alertId, a.level);
          }
        }
      }
    }
  }

  return {
    vehicle_docs: vehicleDocCount,
    driver_docs: driverDocCount,
    services: serviceCount,
    emails_sent: emailsSent,
  };
}

// Fetch email recipients for an organization.
// Priority: 1) per-org UI config (DB), 2) ALERT_EMAIL_RECIPIENTS env var, 3) admin users fallback
async function getOrgEmailRecipients(organizationId: string): Promise<string[]> {
  const emails = new Set<string>();

  // 1. Per-org configured recipients (set via Settings UI)
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { alertEmailRecipients: true },
  });
  if (org?.alertEmailRecipients && org.alertEmailRecipients.length > 0) {
    org.alertEmailRecipients.filter(Boolean).forEach((e) => emails.add(e));
    return Array.from(emails);
  }

  // 2. Global env var override (comma-separated)
  const envRecipients = process.env.ALERT_EMAIL_RECIPIENTS;
  if (envRecipients) {
    envRecipients
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean)
      .forEach((e) => emails.add(e));
    return Array.from(emails);
  }

  // 3. Fallback: SUPER_ADMIN and FLEET_ADMIN users of this org
  const admins = await prisma.user.findMany({
    where: {
      organizationId,
      isActive: true,
      role: { name: { in: ["SUPER_ADMIN", "FLEET_ADMIN"] } },
    },
    select: { email: true },
  });

  admins
    .map((u) => u.email)
    .filter(Boolean)
    .forEach((e) => emails.add(e));

  return Array.from(emails);
}

export async function generateAlertsForAllOrgs(): Promise<void> {
  const orgs = await prisma.organization.findMany({ select: { id: true } });
  for (const org of orgs) {
    await generateAlertsForOrg(org.id, { sendDigest: true });
  }
}
