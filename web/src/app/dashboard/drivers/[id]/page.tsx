import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button-link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DriverStatusBadge } from "@/components/drivers/driver-status-badge";
import { DocStatusBadge } from "@/components/vehicles/doc-status-badge";
import { VehicleStatusBadge } from "@/components/vehicles/vehicle-status-badge";
import {
  ChevronLeft,
  Pencil,
  AlertTriangle,
  Truck,
  FileText,
  Phone,
  Mail,
  MapPin,
} from "lucide-react";
import { ASSIGNMENT_TYPE_LABELS } from "@/lib/driver-status";

function fmtDate(val: Date | null | undefined): string {
  if (!val) return "—";
  return new Date(val).toLocaleDateString("sr-RS");
}

const travelStatusLabels: Record<string, string> = {
  draft: "Nacrt",
  approved: "Odobren",
  completed: "Završen",
  cancelled: "Otkazan",
};

const alertLevelColor: Record<string, string> = {
  warning: "bg-orange-100 text-orange-800",
  critical: "bg-red-100 text-red-800",
  expired: "bg-red-900 text-white",
};

export default async function DriverDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const { id } = await params;
  const orgId = session?.user?.organizationId;
  const canEdit = ["SUPER_ADMIN", "FLEET_ADMIN"].includes(session?.user?.role ?? "");

  const driver = await prisma.driver.findFirst({
    where: { id, ...(orgId ? { organizationId: orgId } : {}) },
    include: {
      documents: { orderBy: { type: "asc" } },
      assignments: {
        orderBy: { assignedAt: "desc" },
        include: {
          vehicle: {
            select: {
              id: true,
              registrationNumber: true,
              make: true,
              model: true,
              status: true,
            },
          },
        },
      },
      travelOrders: {
        orderBy: { departureAt: "desc" },
        take: 5,
        include: {
          vehicle: { select: { id: true, registrationNumber: true } },
        },
      },
      alerts: { where: { status: "active" }, orderBy: { createdAt: "desc" } },
    },
  });

  if (!driver) notFound();

  const activeAssignment = driver.assignments.find(
    (a) => a.status === "active" && a.type === "vehicle"
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Link href="/dashboard/drivers" className="hover:text-foreground flex items-center gap-1">
              <ChevronLeft className="size-4" /> Vozači
            </Link>
            <span>/</span>
            <span className="text-foreground">
              {driver.lastName} {driver.firstName}
            </span>
          </div>
          <h1 className="text-2xl font-semibold">
            {driver.firstName} {driver.lastName}
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            <DriverStatusBadge status={driver.employmentStatus} />
            {driver.jobTitle && (
              <span className="text-sm text-muted-foreground">{driver.jobTitle}</span>
            )}
            {driver.alerts.length > 0 && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="size-3" />
                {driver.alerts.length} alarm{driver.alerts.length > 1 ? "a" : ""}
              </Badge>
            )}
          </div>
        </div>
        {canEdit && (
          <ButtonLink href={`/dashboard/drivers/${id}/edit`} variant="outline" size="sm">
            <Pencil className="size-4" /> Izmeni
          </ButtonLink>
        )}
      </div>

      {/* Alarmi */}
      {driver.alerts.length > 0 && (
        <div className="space-y-2">
          {driver.alerts.map((a) => (
            <div
              key={a.id}
              className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm ${alertLevelColor[a.level] ?? "bg-muted"}`}
            >
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <div>
                <p className="font-medium">{a.title}</p>
                {a.message && <p className="opacity-80">{a.message}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Lični podaci */}
        <Card>
          <CardHeader><CardTitle>Lični podaci</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {driver.phone && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="size-4 shrink-0" />
                <a href={`tel:${driver.phone}`} className="hover:text-foreground">{driver.phone}</a>
              </div>
            )}
            {driver.email && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="size-4 shrink-0" />
                <a href={`mailto:${driver.email}`} className="hover:text-foreground">{driver.email}</a>
              </div>
            )}
            {driver.address && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="size-4 shrink-0" />
                <span>{driver.address}</span>
              </div>
            )}
            <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
              <dt className="text-muted-foreground">JMBG / ID</dt>
              <dd className="font-mono text-xs">{driver.externalId ?? "—"}</dd>
              <dt className="text-muted-foreground">Datum zaposlenja</dt>
              <dd>{fmtDate(driver.employmentStartDate)}</dd>
              {driver.notes && (
                <>
                  <dt className="text-muted-foreground">Napomena</dt>
                  <dd className="text-xs">{driver.notes}</dd>
                </>
              )}
            </dl>
          </CardContent>
        </Card>

        {/* Dokumenta */}
        <Card>
          <CardHeader><CardTitle>Dokumenta</CardTitle></CardHeader>
          <CardContent>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 text-sm">
              <dt className="text-muted-foreground">Br. vozačke</dt>
              <dd className="font-mono text-xs">{driver.licenseNumber ?? "—"}</dd>
              <dt className="text-muted-foreground">Kategorije</dt>
              <dd>{driver.licenseCategories ?? "—"}</dd>
              <dt className="text-muted-foreground">Vozačka — važi do</dt>
              <dd><DocStatusBadge validTo={driver.licenseExpiry} /></dd>
              <dt className="text-muted-foreground">Br. lične karte</dt>
              <dd className="font-mono text-xs">{driver.idCardNumber ?? "—"}</dd>
              <dt className="text-muted-foreground">Lična karta — važi do</dt>
              <dd><DocStatusBadge validTo={driver.idCardExpiry} /></dd>
            </dl>
          </CardContent>
        </Card>
      </div>

      {/* Trenutno vozilo */}
      {activeAssignment?.vehicle && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="size-5" /> Trenutno zaduženo vozilo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Link
                href={`/dashboard/vehicles/${activeAssignment.vehicle.id}`}
                className="flex items-center gap-3 hover:underline"
              >
                <span className="font-mono font-semibold text-lg">
                  {activeAssignment.vehicle.registrationNumber}
                </span>
                <span className="text-muted-foreground">
                  {activeAssignment.vehicle.make} {activeAssignment.vehicle.model}
                </span>
              </Link>
              <VehicleStatusBadge status={activeAssignment.vehicle.status} />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Zaduženo: {fmtDate(activeAssignment.assignedAt)}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Sva zaduženja */}
      {driver.assignments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Istorija zaduženja</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tip</TableHead>
                  <TableHead>Vozilo</TableHead>
                  <TableHead>Preuzeto</TableHead>
                  <TableHead>Razduž.</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {driver.assignments.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>{ASSIGNMENT_TYPE_LABELS[a.type] ?? a.type}</TableCell>
                    <TableCell>
                      {a.vehicle ? (
                        <Link
                          href={`/dashboard/vehicles/${a.vehicle.id}`}
                          className="font-mono text-sm hover:underline"
                        >
                          {a.vehicle.registrationNumber}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{fmtDate(a.assignedAt)}</TableCell>
                    <TableCell className="text-sm">{fmtDate(a.returnedAt)}</TableCell>
                    <TableCell>
                      <Badge
                        variant={a.status === "active" ? "default" : "outline"}
                        className={
                          a.status === "active"
                            ? "bg-green-100 text-green-800 border-green-200"
                            : "text-muted-foreground"
                        }
                      >
                        {a.status === "active" ? "Aktivno" : "Razduženo"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Putni nalozi */}
      {driver.travelOrders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="size-5" /> Poslednji putni nalozi
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Broj naloga</TableHead>
                  <TableHead>Relacija</TableHead>
                  <TableHead>Vozilo</TableHead>
                  <TableHead>Polazak</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Km</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {driver.travelOrders.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-mono text-xs">{t.orderNumber}</TableCell>
                    <TableCell className="max-w-48 truncate text-sm">{t.route ?? "—"}</TableCell>
                    <TableCell>
                      {t.vehicle ? (
                        <Link
                          href={`/dashboard/vehicles/${t.vehicle.id}`}
                          className="font-mono text-sm hover:underline"
                        >
                          {t.vehicle.registrationNumber}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{fmtDate(t.departureAt)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {travelStatusLabels[t.status] ?? t.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {t.distanceKm ? `${t.distanceKm.toLocaleString("sr-RS")} km` : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
