import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button-link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, Pencil, Fuel } from "lucide-react";
import { DeleteFuelButton } from "@/components/fuel/delete-fuel-button";

function fmtDate(v: Date | string | null | undefined) {
  if (!v) return "—";
  return new Date(v).toLocaleDateString("sr-Latn-RS");
}

function fmtMoney(v: unknown) {
  if (v === null || v === undefined) return "—";
  return `${Number(v).toLocaleString("sr-RS", { minimumFractionDigits: 2 })} RSD`;
}

function fmtNum(v: unknown, decimals = 0) {
  if (v === null || v === undefined) return "—";
  return Number(v).toLocaleString("sr-RS", { minimumFractionDigits: decimals });
}

export default async function FuelDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const { id } = await params;
  const orgId = session?.user?.organizationId;
  const canEdit = ["SUPER_ADMIN", "FLEET_ADMIN", "DISPATCHER"].includes(session?.user?.role ?? "");
  const canDelete = ["SUPER_ADMIN", "FLEET_ADMIN"].includes(session?.user?.role ?? "");

  const entry = await prisma.fuelEntry.findFirst({
    where: {
      id,
      vehicle: { ...(orgId ? { organizationId: orgId } : {}) },
    },
    include: {
      vehicle: {
        select: { id: true, registrationNumber: true, make: true, model: true },
      },
    },
  });

  if (!entry) notFound();

  const consumption =
    entry.odometerDeltaKm && entry.odometerDeltaKm > 0 && entry.fuelLiters
      ? (Number(entry.fuelLiters) / entry.odometerDeltaKm) * 100
      : null;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/dashboard/fuel" className="flex items-center gap-1 hover:text-foreground">
              <ChevronLeft className="size-4" /> Gorivo
            </Link>
            <span>/</span>
            <Link href={`/dashboard/vehicles/${entry.vehicle.id}`} className="hover:text-foreground">
              {entry.vehicle.registrationNumber}
            </Link>
            <span>/</span>
            <span className="text-foreground">{fmtDate(entry.date)}</span>
          </div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Fuel className="size-6 text-muted-foreground" />
            Sipanje — {fmtDate(entry.date)}
          </h1>
          <p className="text-sm text-muted-foreground">
            <Link href={`/dashboard/vehicles/${entry.vehicle.id}`} className="text-primary hover:underline font-mono">
              {entry.vehicle.registrationNumber}
            </Link>
            {" "}— {entry.vehicle.make} {entry.vehicle.model}
          </p>
        </div>
        <div className="flex gap-2">
          {canEdit && (
            <ButtonLink href={`/dashboard/fuel/${id}/edit`} variant="outline" size="sm">
              <Pencil className="size-4" /> Izmeni
            </ButtonLink>
          )}
          {canDelete && <DeleteFuelButton entryId={id} />}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Podaci */}
        <Card>
          <CardHeader><CardTitle>Podaci o sipanju</CardTitle></CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <dt className="text-muted-foreground">Datum</dt>
              <dd className="font-medium">{fmtDate(entry.date)}</dd>

              <dt className="text-muted-foreground">Stanje km</dt>
              <dd className="font-medium">{fmtNum(entry.odometerKm)} km</dd>

              <dt className="text-muted-foreground">Pređeno od preth.</dt>
              <dd>
                {entry.odometerDeltaKm
                  ? `${fmtNum(entry.odometerDeltaKm)} km`
                  : <span className="text-muted-foreground">—</span>}
              </dd>

              <dt className="text-muted-foreground">Tip goriva</dt>
              <dd>{entry.fuelType ?? "—"}</dd>

              <dt className="text-muted-foreground">Količina</dt>
              <dd className="font-medium">
                {entry.fuelLiters ? `${fmtNum(entry.fuelLiters, 2)} L` : "—"}
              </dd>

              <dt className="text-muted-foreground">Cena po litru</dt>
              <dd>
                {entry.pricePerLiter ? `${fmtNum(entry.pricePerLiter, 4)} RSD` : "—"}
              </dd>

              <dt className="text-muted-foreground">Ukupan iznos</dt>
              <dd className="font-medium text-base">{fmtMoney(entry.totalAmount)}</dd>

              <dt className="text-muted-foreground">Lokacija / pumpa</dt>
              <dd>{entry.location ?? "—"}</dd>

              {entry.notes && (
                <>
                  <dt className="text-muted-foreground">Napomena</dt>
                  <dd className="text-xs">{entry.notes}</dd>
                </>
              )}
            </dl>
          </CardContent>
        </Card>

        {/* Potrošnja */}
        <Card>
          <CardHeader><CardTitle>Analiza potrošnje</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {consumption ? (
              <div className="rounded-lg border p-4 text-center">
                <p className="text-sm text-muted-foreground mb-1">Prosečna potrošnja (za ovaj unos)</p>
                <p
                  className={`text-4xl font-bold ${
                    consumption > 35
                      ? "text-red-600"
                      : consumption > 25
                      ? "text-orange-500"
                      : "text-green-600"
                  }`}
                >
                  {consumption.toFixed(1)}
                </p>
                <p className="text-sm text-muted-foreground mt-1">L / 100 km</p>
                {consumption > 35 && (
                  <p className="mt-2 text-xs text-red-500">
                    Visoka potrošnja — preporuča se provera vozila
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Potrošnja se ne može izračunati — nedostaje km delta ili količina goriva.
              </p>
            )}

            <div className="space-y-2 text-sm">
              {entry.odometerDeltaKm && entry.totalAmount ? (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Trošak po km</span>
                  <span className="font-medium">
                    {(Number(entry.totalAmount) / entry.odometerDeltaKm).toFixed(2)} RSD/km
                  </span>
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Vozilo shortcut */}
      <Card>
        <CardContent className="flex items-center justify-between py-4">
          <div>
            <p className="font-mono font-medium text-primary">
              {entry.vehicle.registrationNumber}
            </p>
            <p className="text-sm text-muted-foreground">
              {entry.vehicle.make} {entry.vehicle.model}
            </p>
          </div>
          <div className="flex gap-2">
            <ButtonLink href={`/dashboard/fuel?vehicle=${entry.vehicleId}`} variant="outline" size="sm">
              Sva sipanja ovog vozila
            </ButtonLink>
            <ButtonLink href={`/dashboard/vehicles/${entry.vehicle.id}`} variant="outline" size="sm">
              Pregled vozila
            </ButtonLink>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
