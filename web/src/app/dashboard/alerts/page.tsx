import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertLevelBadge, ALERT_TYPE_LABELS } from "@/components/alerts/alert-level-badge";
import { AlertsActionButtons } from "@/components/alerts/alerts-action-buttons";
import { GenerateAlertsButton } from "@/components/alerts/generate-alerts-button";
import { Bell, CheckCircle, EyeOff, Search } from "lucide-react";

const LEVEL_ORDER: Record<string, number> = { expired: 0, critical: 1, warning: 2 };

export default async function AlertsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; level?: string; type?: string }>;
}) {
  const session = await auth();
  const orgId = session?.user?.organizationId;
  const canAdmin = ["SUPER_ADMIN", "FLEET_ADMIN"].includes(session?.user?.role ?? "");

  const { status = "active", level, type } = await searchParams;

  const orgFilter = orgId
    ? {
        OR: [
          { vehicle: { organizationId: orgId } },
          { driver: { organizationId: orgId } },
        ],
      }
    : {};

  const [alerts, counts] = await Promise.all([
    prisma.alert.findMany({
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
      orderBy: { createdAt: "desc" },
    }),
    // Counts by status (for tabs)
    prisma.alert.groupBy({
      by: ["status"],
      where: orgFilter,
      _count: true,
    }),
  ]);

  // Sort: expired → critical → warning
  if (status === "active") {
    alerts.sort(
      (a, b) => (LEVEL_ORDER[a.level] ?? 9) - (LEVEL_ORDER[b.level] ?? 9)
    );
  }

  const countByStatus = Object.fromEntries(
    counts.map((c) => [c.status, c._count])
  );

  // Level breakdown for active alerts summary
  const levelBreakdown = {
    expired: alerts.filter((a) => a.level === "expired").length,
    critical: alerts.filter((a) => a.level === "critical").length,
    warning: alerts.filter((a) => a.level === "warning").length,
  };

  const statusTabs = [
    { value: "active", label: "Aktivni", count: countByStatus["active"] ?? 0 },
    { value: "resolved", label: "Rešeni", count: countByStatus["resolved"] ?? 0 },
    { value: "ignored", label: "Ignorisani", count: countByStatus["ignored"] ?? 0 },
  ];

  const levelFilters = [
    { value: "", label: "Svi nivoi" },
    { value: "expired", label: "Istekli" },
    { value: "critical", label: "Kritični" },
    { value: "warning", label: "Upozorenja" },
  ];

  const typeFilters = [
    { value: "", label: "Svi tipovi" },
    { value: "vehicle_doc_expiry", label: "Dokumenti vozila" },
    { value: "driver_license_expiry", label: "Vozačke dozvole" },
    { value: "driver_idcard_expiry", label: "Lične karte" },
    { value: "service_due_date", label: "Servisi" },
  ];

  function buildHref(overrides: Record<string, string>) {
    const p: Record<string, string> = { status, ...(level ? { level } : {}), ...(type ? { type } : {}) };
    Object.assign(p, overrides);
    // Remove empty string keys
    Object.keys(p).forEach((k) => { if (!p[k]) delete p[k]; });
    const qs = new URLSearchParams(p).toString();
    return `/dashboard/alerts${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Alarmi</h1>
          <p className="text-muted-foreground">
            Automatska upozorenja za isteke, servise i dokumentaciju
          </p>
        </div>
        {canAdmin && <GenerateAlertsButton />}
      </div>

      {/* Summary cards (only for active) */}
      {status === "active" && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-red-200 bg-red-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-red-800">Istekli</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-red-900">{levelBreakdown.expired}</p>
            </CardContent>
          </Card>
          <Card className="border-red-100 bg-red-50/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-red-700">Kritični</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-red-800">{levelBreakdown.critical}</p>
            </CardContent>
          </Card>
          <Card className="border-orange-100 bg-orange-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-orange-800">Upozorenja</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-orange-900">{levelBreakdown.warning}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Status tabs */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-2">
          {statusTabs.map((tab) => (
            <Link key={tab.value} href={buildHref({ status: tab.value })}>
              <Badge
                variant={status === tab.value ? "default" : "outline"}
                className="cursor-pointer gap-1"
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className="ml-1 rounded-full bg-background/20 px-1 text-xs">
                    {tab.count}
                  </span>
                )}
              </Badge>
            </Link>
          ))}
        </div>

        {/* Level filter */}
        <div className="flex gap-1">
          {levelFilters.map((f) => (
            <Link key={f.value} href={buildHref({ level: f.value })}>
              <Badge
                variant={(level ?? "") === f.value ? "default" : "outline"}
                className="cursor-pointer text-xs"
              >
                {f.label}
              </Badge>
            </Link>
          ))}
        </div>

        {/* Type filter */}
        <div className="flex flex-wrap gap-1">
          {typeFilters.map((f) => (
            <Link key={f.value} href={buildHref({ type: f.value })}>
              <Badge
                variant={(type ?? "") === f.value ? "secondary" : "outline"}
                className="cursor-pointer text-xs"
              >
                {f.label}
              </Badge>
            </Link>
          ))}
        </div>
      </div>

      {/* Alerts table */}
      <Card>
        <CardContent className="p-0">
          {alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
              {status === "active" ? (
                <>
                  <CheckCircle className="mb-3 size-10 opacity-30 text-green-500" />
                  <p className="font-medium">Nema aktivnih alarma</p>
                  <p className="text-sm">
                    Klikni &quot;Generiši alarme&quot; da ažuriraš statuse.
                  </p>
                </>
              ) : (
                <>
                  <Search className="mb-3 size-10 opacity-30" />
                  <p className="font-medium">Nema alarma</p>
                </>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-28">Nivo</TableHead>
                  <TableHead className="w-40">Tip</TableHead>
                  <TableHead>Opis</TableHead>
                  <TableHead>Entitet</TableHead>
                  <TableHead className="w-36">Datum</TableHead>
                  {status === "resolved" && <TableHead className="w-36">Rešio/la</TableHead>}
                  {status === "active" && canAdmin && (
                    <TableHead className="w-36 text-right">Akcije</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {alerts.map((alert) => (
                  <TableRow key={alert.id}>
                    <TableCell>
                      <AlertLevelBadge level={alert.level} />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {ALERT_TYPE_LABELS[alert.type] ?? alert.type}
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-sm">{alert.title}</p>
                      {alert.message && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {alert.message}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {alert.vehicle && (
                        <Link
                          href={`/dashboard/vehicles/${alert.vehicle.id}`}
                          className="hover:underline text-primary"
                        >
                          {alert.vehicle.registrationNumber}
                          <span className="text-muted-foreground ml-1 text-xs">
                            {alert.vehicle.make} {alert.vehicle.model}
                          </span>
                        </Link>
                      )}
                      {alert.driver && (
                        <Link
                          href={`/dashboard/drivers/${alert.driver.id}`}
                          className="hover:underline text-primary"
                        >
                          {alert.driver.firstName} {alert.driver.lastName}
                        </Link>
                      )}
                      {!alert.vehicle && !alert.driver && (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(alert.createdAt).toLocaleDateString("sr-Latn-RS")}
                    </TableCell>
                    {status === "resolved" && (
                      <TableCell className="text-xs text-muted-foreground">
                        {alert.resolvedBy ?? "—"}
                        {alert.resolvedAt && (
                          <span className="block">
                            {new Date(alert.resolvedAt).toLocaleDateString("sr-Latn-RS")}
                          </span>
                        )}
                      </TableCell>
                    )}
                    {status === "active" && canAdmin && (
                      <TableCell className="text-right">
                        <AlertsActionButtons alertId={alert.id} />
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
