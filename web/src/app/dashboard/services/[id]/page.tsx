import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button-link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, Pencil, Wrench, Calendar, Gauge } from "lucide-react";
import { DeleteServiceButton } from "@/components/services/delete-service-button";

const TYPE_LABELS: Record<string, string> = {
  routine: "Redovan",
  repair: "Vanredan / kvar",
  preventive: "Preventivni",
};

const TYPE_VARIANT: Record<string, "secondary" | "destructive" | "outline"> = {
  routine: "secondary",
  repair: "destructive",
  preventive: "outline",
};

function fmtDate(v: Date | string | null | undefined) {
  if (!v) return "—";
  return new Date(v).toLocaleDateString("sr-Latn-RS");
}

function fmtMoney(v: unknown) {
  if (v === null || v === undefined) return "—";
  return `${Number(v).toLocaleString("sr-RS")} RSD`;
}

export default async function ServiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const { id } = await params;
  const orgId = session?.user?.organizationId;
  const canEdit = ["SUPER_ADMIN", "FLEET_ADMIN", "DISPATCHER"].includes(session?.user?.role ?? "");
  const canDelete = ["SUPER_ADMIN", "FLEET_ADMIN"].includes(session?.user?.role ?? "");

  const record = await prisma.serviceRecord.findFirst({
    where: {
      id,
      vehicle: { ...(orgId ? { organizationId: orgId } : {}) },
    },
    include: {
      vehicle: {
        select: { id: true, registrationNumber: true, make: true, model: true, status: true },
      },
    },
  });

  if (!record) notFound();

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/dashboard/services" className="flex items-center gap-1 hover:text-foreground">
              <ChevronLeft className="size-4" /> Servisi
            </Link>
            <span>/</span>
            <Link
              href={`/dashboard/vehicles/${record.vehicle.id}`}
              className="hover:text-foreground"
            >
              {record.vehicle.registrationNumber}
            </Link>
            <span>/</span>
            <span className="text-foreground">Detalji servisa</span>
          </div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Wrench className="size-6 text-muted-foreground" />
            {record.description
              ? record.description.length > 60
                ? record.description.slice(0, 60) + "…"
                : record.description
              : TYPE_LABELS[record.type] ?? record.type}
          </h1>
          <div className="flex items-center gap-2">
            <Badge variant={TYPE_VARIANT[record.type] ?? "outline"}>
              {TYPE_LABELS[record.type] ?? record.type}
            </Badge>
            <Link
              href={`/dashboard/vehicles/${record.vehicle.id}`}
              className="text-sm text-primary hover:underline font-mono"
            >
              {record.vehicle.registrationNumber}
            </Link>
            <span className="text-sm text-muted-foreground">
              {record.vehicle.make} {record.vehicle.model}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          {canEdit && (
            <ButtonLink href={`/dashboard/services/${id}/edit`} variant="outline" size="sm">
              <Pencil className="size-4" /> Izmeni
            </ButtonLink>
          )}
          {canDelete && <DeleteServiceButton serviceId={id} />}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Podaci o servisu */}
        <Card>
          <CardHeader>
            <CardTitle>Podaci o servisu</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <dt className="text-muted-foreground">Tip</dt>
              <dd>
                <Badge variant={TYPE_VARIANT[record.type] ?? "outline"} className="text-xs">
                  {TYPE_LABELS[record.type] ?? record.type}
                </Badge>
              </dd>

              <dt className="text-muted-foreground">Datum upućivanja</dt>
              <dd>{fmtDate(record.sentAt)}</dd>

              <dt className="text-muted-foreground">Datum završetka</dt>
              <dd>{fmtDate(record.completedAt)}</dd>

              <dt className="text-muted-foreground">Trajanje</dt>
              <dd>
                {record.sentAt && record.completedAt
                  ? (() => {
                      const days = Math.round(
                        (new Date(record.completedAt).getTime() -
                          new Date(record.sentAt).getTime()) /
                          86400000
                      );
                      return days === 0 ? "Isti dan" : `${days} dan${days > 1 ? "a" : ""}`;
                    })()
                  : "—"}
              </dd>

              <dt className="text-muted-foreground">Opis radova</dt>
              <dd className="col-span-2 -mt-1 text-sm leading-relaxed">
                {record.description ?? "—"}
              </dd>

              <dt className="text-muted-foreground">Servis / radionica</dt>
              <dd>{record.workshop ?? "—"}</dd>

              <dt className="text-muted-foreground">Iznos računa</dt>
              <dd className="font-medium">{fmtMoney(record.invoiceAmount)}</dd>

              <dt className="text-muted-foreground">Broj računa</dt>
              <dd className="font-mono text-xs">{record.invoiceNumber ?? "—"}</dd>

              {record.notes && (
                <>
                  <dt className="text-muted-foreground">Napomena</dt>
                  <dd className="text-xs">{record.notes}</dd>
                </>
              )}
            </dl>
          </CardContent>
        </Card>

        {/* Sledeći servis */}
        <Card>
          <CardHeader>
            <CardTitle>Sledeći servis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!record.nextServiceDate && !record.nextServiceKm ? (
              <p className="text-sm text-muted-foreground">
                Nije planiran sledeći servis.
              </p>
            ) : (
              <>
                {record.nextServiceDate && (
                  <div className="flex items-start gap-3 rounded-lg border p-4">
                    <Calendar className="mt-0.5 size-5 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-sm font-medium">Po datumu</p>
                      <p className="text-xl font-bold mt-1">
                        {fmtDate(record.nextServiceDate)}
                      </p>
                      {(() => {
                        const days = Math.ceil(
                          (new Date(record.nextServiceDate).getTime() - Date.now()) / 86400000
                        );
                        return (
                          <p
                            className={`text-xs mt-1 ${
                              days < 0
                                ? "text-red-600 font-medium"
                                : days <= 7
                                ? "text-red-500"
                                : days <= 30
                                ? "text-orange-500"
                                : "text-muted-foreground"
                            }`}
                          >
                            {days < 0
                              ? `Prošao pre ${Math.abs(days)} dana`
                              : days === 0
                              ? "Danas!"
                              : `Za ${days} dana`}
                          </p>
                        );
                      })()}
                    </div>
                  </div>
                )}

                {record.nextServiceKm && (
                  <div className="flex items-start gap-3 rounded-lg border p-4">
                    <Gauge className="mt-0.5 size-5 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-sm font-medium">Po kilometraži</p>
                      <p className="text-xl font-bold mt-1">
                        {record.nextServiceKm.toLocaleString("sr-RS")} km
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Podaci o vozilu */}
      <Card>
        <CardHeader>
          <CardTitle>Vozilo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-mono font-medium text-primary text-lg">
                {record.vehicle.registrationNumber}
              </p>
              <p className="text-sm text-muted-foreground">
                {record.vehicle.make} {record.vehicle.model}
              </p>
            </div>
            <ButtonLink
              href={`/dashboard/vehicles/${record.vehicle.id}`}
              variant="outline"
              size="sm"
            >
              Pregled vozila
            </ButtonLink>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
