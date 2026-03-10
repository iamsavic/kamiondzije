import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Bell, Info, Mail } from "lucide-react";
import { ensureAlertRules } from "@/lib/alert-rules";
import { ALERT_RULE_TYPES } from "@/lib/alert-rule-types";
import { NotificationRulesForm } from "@/components/settings/notification-rules-form";
import { EmailRecipientsForm } from "@/components/settings/email-recipients-form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { prisma } from "@/lib/db";

export const metadata = { title: "Podešavanja notifikacija" };

export default async function NotificationSettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = session.user.role;
  const isAdmin = role === "SUPER_ADMIN" || role === "FLEET_ADMIN";

  // Prefer organizationId from session; if missing (stale JWT), fetch from DB
  let orgId = session.user.organizationId;
  if (!orgId) {
    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { organizationId: true },
    });
    orgId = dbUser?.organizationId ?? undefined;
  }

  if (!orgId) redirect("/dashboard");

  const [dbRules, org] = await Promise.all([
    ensureAlertRules(orgId),
    prisma.organization.findUnique({
      where: { id: orgId },
      select: { alertEmailRecipients: true },
    }),
  ]);

  const emailRecipients = org?.alertEmailRecipients ?? [];

  const rules = dbRules.map((r) => {
    const meta = ALERT_RULE_TYPES.find((t) => t.type === r.type);
    return {
      id: r.id,
      type: r.type,
      name: meta?.name ?? r.name,
      warningDays: r.warningDays,
      criticalDays: r.criticalDays,
      isActive: r.isActive,
    };
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
          <Bell className="size-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">Podešavanja notifikacija</h1>
          <p className="text-sm text-muted-foreground">
            Konfigurišite pragove upozorenja za alarme voznog parka
          </p>
        </div>
      </div>

      {!isAdmin && (
        <Alert>
          <Info className="size-4" />
          <AlertDescription>
            Nemate ovlašćenje za izmenu podešavanja. Obratite se administratoru.
          </AlertDescription>
        </Alert>
      )}

      <p className="text-sm text-muted-foreground">
        Sistem generiše alarme kada se rokovi dokumenata i servisa približe. Ovde možete
        podesiti koliko dana pre isteka se aktivira svaki nivo upozorenja.
      </p>

      {isAdmin ? (
        <NotificationRulesForm rules={rules} />
      ) : (
        <div className="grid gap-4">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className="rounded-lg border bg-card p-4 opacity-75"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{rule.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Narandžasto: {rule.warningDays} dana · Crveno: {rule.criticalDays} dana
                  </p>
                </div>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    rule.isActive
                      ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {rule.isActive ? "Aktivno" : "Neaktivno"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Email recipients section */}
      <div className="space-y-4 border-t pt-6">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
            <Mail className="size-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Email primaoci obaveštenja</h2>
            <p className="text-sm text-muted-foreground">
              Email adrese na koje stižu obaveštenja o alarmima
            </p>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          Kada sistem generiše alarm (istek dokumenta, vozačke dozvole, servisnog roka...), 
          obaveštenje se šalje na sve navedene adrese. Ako lista ostane prazna, 
          obaveštenja idu admin korisnicima organizacije.
        </p>

        {isAdmin ? (
          <EmailRecipientsForm initialEmails={emailRecipients} />
        ) : (
          <div className="rounded-lg border bg-card p-4 opacity-75">
            {emailRecipients.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nisu podešene email adrese — obaveštenja idu admin korisnicima
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {emailRecipients.map((email: string) => (
                  <span
                    key={email}
                    className="inline-flex items-center gap-1.5 rounded-full border bg-background px-3 py-1 text-sm"
                  >
                    <Mail className="size-3 text-muted-foreground" />
                    {email}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
