import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertLevelBadge } from "@/components/alerts/alert-level-badge";
import { ButtonLink } from "@/components/ui/button-link";
import { Bell, Truck, Users, ArrowRight } from "lucide-react";

export default async function DashboardPage() {
  const session = await auth();
  const organizationId = session?.user?.organizationId;

  const orgFilter = organizationId ? { organizationId } : {};
  const alertOrgFilter = organizationId
    ? {
        OR: [
          { vehicle: { organizationId } },
          { driver: { organizationId } },
        ],
      }
    : {};

  const [vehiclesCount, driversCount, alertsByLevel, recentAlerts] =
    await Promise.all([
      prisma.vehicle.count({ where: orgFilter }),
      prisma.driver.count({
        where: { ...orgFilter, employmentStatus: "active" },
      }),
      prisma.alert.groupBy({
        by: ["level"],
        where: { ...alertOrgFilter, status: "active" },
        _count: true,
      }),
      prisma.alert.findMany({
        where: { ...alertOrgFilter, status: "active" },
        include: {
          vehicle: {
            select: { id: true, registrationNumber: true, make: true, model: true },
          },
          driver: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ]);

  const levelOrder: Record<string, number> = { expired: 0, critical: 1, warning: 2 };
  recentAlerts.sort(
    (a, b) => (levelOrder[a.level] ?? 9) - (levelOrder[b.level] ?? 9)
  );

  const alertCounts = Object.fromEntries(
    alertsByLevel.map((g) => [g.level, g._count])
  );
  const totalAlerts = alertsByLevel.reduce((s, g) => s + g._count, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-muted-foreground">Pregled voznog parka i alarmâ</p>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Vozila
            </CardTitle>
            <Truck className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{vehiclesCount}</p>
            <Link href="/dashboard/vehicles" className="text-xs text-primary hover:underline">
              Pregled →
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Aktivni vozači
            </CardTitle>
            <Users className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{driversCount}</p>
            <Link href="/dashboard/drivers" className="text-xs text-primary hover:underline">
              Pregled →
            </Link>
          </CardContent>
        </Card>

        <Card className={totalAlerts > 0 ? "border-red-200" : ""}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Aktivni alarmi
            </CardTitle>
            <Bell className={`size-4 ${totalAlerts > 0 ? "text-red-500" : "text-muted-foreground"}`} />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalAlerts}</p>
            <Link href="/dashboard/alerts" className="text-xs text-primary hover:underline">
              Pregled →
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Alarmi po nivou
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-1 pt-1">
            {(alertCounts["expired"] ?? 0) > 0 && (
              <Badge className="bg-red-900 text-red-100 text-xs">
                {alertCounts["expired"]} isteklo
              </Badge>
            )}
            {(alertCounts["critical"] ?? 0) > 0 && (
              <Badge className="bg-red-100 text-red-800 border border-red-200 text-xs">
                {alertCounts["critical"]} kritično
              </Badge>
            )}
            {(alertCounts["warning"] ?? 0) > 0 && (
              <Badge className="bg-orange-100 text-orange-800 border border-orange-200 text-xs">
                {alertCounts["warning"]} upozorenja
              </Badge>
            )}
            {totalAlerts === 0 && (
              <p className="text-xs text-muted-foreground">Sve je u redu ✓</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent alerts */}
      {recentAlerts.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Poslednji aktivni alarmi</CardTitle>
            <ButtonLink href="/dashboard/alerts" variant="ghost" size="sm" className="gap-1">
              Svi alarmi <ArrowRight className="size-3" />
            </ButtonLink>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y">
              {recentAlerts.map((alert) => (
                <li key={alert.id} className="flex items-start gap-3 px-6 py-3">
                  <AlertLevelBadge level={alert.level} className="mt-0.5 shrink-0 text-xs" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{alert.title}</p>
                    {alert.message && (
                      <p className="text-xs text-muted-foreground truncate">{alert.message}</p>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    {alert.vehicle && (
                      <Link
                        href={`/dashboard/vehicles/${alert.vehicle.id}`}
                        className="text-xs text-primary hover:underline"
                      >
                        {alert.vehicle.registrationNumber}
                      </Link>
                    )}
                    {alert.driver && (
                      <Link
                        href={`/dashboard/drivers/${alert.driver.id}`}
                        className="text-xs text-primary hover:underline"
                      >
                        {alert.driver.firstName} {alert.driver.lastName}
                      </Link>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {recentAlerts.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Dobrodošli</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Evidencija vozila, vozača, servisa i alarma. Koristite meni za
              navigaciju. Kliknite{" "}
              <Link href="/dashboard/alerts" className="text-primary underline">
                Alarmi → Generiši alarme
              </Link>{" "}
              da biste pokrenuli prvu analizu rokova.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
