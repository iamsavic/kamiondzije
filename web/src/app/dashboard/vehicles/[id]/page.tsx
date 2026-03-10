import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { VehicleStatusBadge } from "@/components/vehicles/vehicle-status-badge";
import { DocStatusBadge } from "@/components/vehicles/doc-status-badge";
import { AddDocumentDialog } from "@/components/vehicles/add-document-dialog";
import { ChevronLeft, Pencil, AlertTriangle, Wrench, Fuel, FileText } from "lucide-react";
import { DOC_TYPE_LABELS } from "@/lib/doc-status";

function fmt(val: unknown): string {
  if (val === null || val === undefined) return "—";
  if (val instanceof Date) return val.toLocaleDateString("sr-RS");
  if (typeof val === "number") return val.toLocaleString("sr-RS");
  return String(val);
}

function fmtDate(val: string | Date | null | undefined): string {
  if (!val) return "—";
  return new Date(val).toLocaleDateString("sr-RS");
}

function fmtMoney(val: unknown): string {
  if (val === null || val === undefined) return "—";
  return `€${Number(val).toLocaleString("sr-RS", { minimumFractionDigits: 0 })}`;
}

export default async function VehicleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const { id } = await params;
  const orgId = session?.user?.organizationId;
  const canEdit = ["SUPER_ADMIN", "FLEET_ADMIN"].includes(session?.user?.role ?? "");

  const vehicle = await prisma.vehicle.findFirst({
    where: { id, ...(orgId ? { organizationId: orgId } : {}) },
    include: {
      documents: { orderBy: { type: "asc" } },
      fuelEntries: { orderBy: { date: "desc" }, take: 5 },
      serviceRecords: { orderBy: { sentAt: "desc" }, take: 5 },
      assignments: {
        orderBy: { assignedAt: "desc" },
        include: { driver: { select: { id: true, firstName: true, lastName: true } } },
      },
      alerts: { where: { status: "active" }, orderBy: { createdAt: "desc" } },
      travelOrders: {
        orderBy: { departureAt: "desc" },
        take: 5,
        include: { driver: { select: { id: true, firstName: true, lastName: true } } },
      },
    },
  });

  if (!vehicle) notFound();

  const activeDriver = vehicle.assignments.find(
    (a) => a.status === "active" && a.type === "vehicle"
  )?.driver;

  const alertLevelColor: Record<string, string> = {
    warning: "bg-orange-100 text-orange-800",
    critical: "bg-red-100 text-red-800",
    expired: "bg-red-900 text-white",
  };

  const travelStatusLabels: Record<string, string> = {
    draft: "Nacrt",
    approved: "Odobren",
    completed: "Završen",
    cancelled: "Otkazan",
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb & header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Link href="/dashboard/vehicles" className="hover:text-foreground flex items-center gap-1">
              <ChevronLeft className="size-4" /> Vozila
            </Link>
            <span>/</span>
            <span className="text-foreground font-mono">{vehicle.registrationNumber}</span>
          </div>
          <h1 className="text-2xl font-semibold">
            {vehicle.make} {vehicle.model}
          </h1>
          <div className="flex items-center gap-2">
            <span className="font-mono text-muted-foreground">{vehicle.registrationNumber}</span>
            <VehicleStatusBadge status={vehicle.status} />
            {vehicle.alerts.length > 0 && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="size-3" />
                {vehicle.alerts.length} alarm{vehicle.alerts.length > 1 ? "a" : ""}
              </Badge>
            )}
          </div>
        </div>
        {canEdit && (
          <ButtonLink href={`/dashboard/vehicles/${id}/edit`} variant="outline" size="sm">
            <Pencil className="size-4" /> Izmeni
          </ButtonLink>
        )}
      </div>

      {/* Alarmi */}
      {vehicle.alerts.length > 0 && (
        <div className="space-y-2">
          {vehicle.alerts.map((a) => (
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
        {/* Osnovno */}
        <Card>
          <CardHeader><CardTitle>Osnovni podaci</CardTitle></CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <dt className="text-muted-foreground">Marka / Model</dt>
              <dd className="font-medium">{vehicle.make} {vehicle.model}</dd>

              <dt className="text-muted-foreground">Godište</dt>
              <dd>{vehicle.year}</dd>

              <dt className="text-muted-foreground">VIN / Šasija</dt>
              <dd className="font-mono text-xs">{vehicle.vin ?? "—"}</dd>

              <dt className="text-muted-foreground">Tip goriva</dt>
              <dd>{vehicle.fuelType ?? "—"}</dd>

              <dt className="text-muted-foreground">Kubikaža</dt>
              <dd>{vehicle.engineDisplacement ? `${vehicle.engineDisplacement} cm³` : "—"}</dd>

              <dt className="text-muted-foreground">Snaga</dt>
              <dd>{vehicle.powerKw ? `${vehicle.powerKw} kW` : "—"}</dd>

              <dt className="text-muted-foreground">Prva registracija</dt>
              <dd>{fmtDate(vehicle.firstRegistration)}</dd>

              <dt className="text-muted-foreground">Aktivan vozač</dt>
              <dd>
                {activeDriver ? (
                  <Link
                    href={`/dashboard/drivers/${activeDriver.id}`}
                    className="text-primary hover:underline"
                  >
                    {activeDriver.firstName} {activeDriver.lastName}
                  </Link>
                ) : (
                  "—"
                )}
              </dd>

              {vehicle.notes && (
                <>
                  <dt className="text-muted-foreground">Napomena</dt>
                  <dd className="text-xs">{vehicle.notes}</dd>
                </>
              )}
            </dl>
          </CardContent>
        </Card>

        {/* Nabavka */}
        <Card>
          <CardHeader><CardTitle>Nabavka i vrednost</CardTitle></CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <dt className="text-muted-foreground">Način nabavke</dt>
              <dd>{vehicle.acquisitionType === "leasing" ? "Lizing" : "Kupovina"}</dd>

              <dt className="text-muted-foreground">Datum nabavke</dt>
              <dd>{fmtDate(vehicle.purchaseDate)}</dd>

              <dt className="text-muted-foreground">Nabavna cena</dt>
              <dd>{fmtMoney(vehicle.purchasePrice)}</dd>

              <dt className="text-muted-foreground">Trenutna vrednost</dt>
              <dd>{fmtMoney(vehicle.currentValue)}</dd>

              {vehicle.acquisitionType === "leasing" && (
                <>
                  <dt className="text-muted-foreground">Lizing kompanija</dt>
                  <dd>{vehicle.leasingCompany ?? "—"}</dd>

                  <dt className="text-muted-foreground">Br. ugovora</dt>
                  <dd className="font-mono text-xs">{vehicle.leasingContractNo ?? "—"}</dd>

                  <dt className="text-muted-foreground">Trajanje</dt>
                  <dd>
                    {fmtDate(vehicle.leasingStart)} – {fmtDate(vehicle.leasingEnd)}
                  </dd>

                  <dt className="text-muted-foreground">Mesečna rata</dt>
                  <dd>{fmtMoney(vehicle.leasingMonthly)}</dd>
                </>
              )}
            </dl>
          </CardContent>
        </Card>
      </div>

      {/* Dokumentacija */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="size-5" /> Dokumentacija
          </CardTitle>
          {canEdit && <AddDocumentDialog vehicleId={id} />}
        </CardHeader>
        <CardContent className="p-0">
          {vehicle.documents.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-muted-foreground">
              Nema unesenih dokumenata.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tip</TableHead>
                  <TableHead>Broj dokumenta</TableHead>
                  <TableHead>Važi od</TableHead>
                  <TableHead>Važi do</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vehicle.documents.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell className="font-medium">
                      {DOC_TYPE_LABELS[doc.type] ?? doc.type}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {doc.documentNumber ?? "—"}
                    </TableCell>
                    <TableCell>{fmtDate(doc.validFrom)}</TableCell>
                    <TableCell>{fmtDate(doc.validTo)}</TableCell>
                    <TableCell>
                      <DocStatusBadge validTo={doc.validTo} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Servisi */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Wrench className="size-5" /> Poslednji servisi
            </CardTitle>
            <ButtonLink href={`/dashboard/services?vehicle=${id}`} variant="ghost" size="sm">
              Svi servisi
            </ButtonLink>
          </CardHeader>
          <CardContent className="p-0">
            {vehicle.serviceRecords.length === 0 ? (
              <p className="px-6 py-6 text-center text-sm text-muted-foreground">Nema servisnih zapisa.</p>
            ) : (
              <div className="divide-y">
                {vehicle.serviceRecords.map((s) => (
                  <div key={s.id} className="px-6 py-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium truncate">{s.description ?? s.type}</span>
                      {s.invoiceAmount && (
                        <span className="text-muted-foreground shrink-0 ml-2">
                          {fmtMoney(s.invoiceAmount)}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {fmtDate(s.sentAt)} {s.workshop ? `— ${s.workshop}` : ""}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Gorivo */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Fuel className="size-5" /> Poslednja sipanja
            </CardTitle>
            <ButtonLink href={`/dashboard/fuel?vehicle=${id}`} variant="ghost" size="sm">
              Sva sipanja
            </ButtonLink>
          </CardHeader>
          <CardContent className="p-0">
            {vehicle.fuelEntries.length === 0 ? (
              <p className="px-6 py-6 text-center text-sm text-muted-foreground">Nema unosa goriva.</p>
            ) : (
              <div className="divide-y">
                {vehicle.fuelEntries.map((f) => (
                  <div key={f.id} className="flex items-center justify-between px-6 py-3 text-sm">
                    <div>
                      <p className="font-medium">
                        {f.fuelLiters ? `${Number(f.fuelLiters).toFixed(0)} L` : "—"}
                        {f.odometerKm ? ` · ${f.odometerKm.toLocaleString("sr-RS")} km` : ""}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {fmtDate(f.date)} {f.location ? `— ${f.location}` : ""}
                      </p>
                    </div>
                    {f.totalAmount && (
                      <span className="text-muted-foreground">{fmtMoney(f.totalAmount)}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Putni nalozi */}
      {vehicle.travelOrders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="size-5" /> Poslednji putni nalozi
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Broj naloga</TableHead>
                  <TableHead>Relacija</TableHead>
                  <TableHead>Vozač</TableHead>
                  <TableHead>Polazak</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Km</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vehicle.travelOrders.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-mono text-xs">{t.orderNumber}</TableCell>
                    <TableCell className="max-w-48 truncate">{t.route ?? "—"}</TableCell>
                    <TableCell className="text-sm">
                      {t.driver ? `${t.driver.firstName} ${t.driver.lastName}` : "—"}
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
          </CardContent>
        </Card>
      )}
    </div>
  );
}
