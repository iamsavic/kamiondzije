import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button-link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Search, TrendingDown } from "lucide-react";

function fmtDate(v: Date | string | null | undefined) {
  if (!v) return "—";
  return new Date(v).toLocaleDateString("sr-Latn-RS");
}

function fmtMoney(v: unknown) {
  if (v === null || v === undefined) return "—";
  return `${Number(v).toLocaleString("sr-RS", { minimumFractionDigits: 0 })} RSD`;
}

function fmtNum(v: unknown, decimals = 0) {
  if (v === null || v === undefined) return "—";
  return Number(v).toLocaleString("sr-RS", { minimumFractionDigits: decimals });
}

export default async function FuelPage({
  searchParams,
}: {
  searchParams: Promise<{ vehicle?: string; search?: string }>;
}) {
  const session = await auth();
  const orgId = session?.user?.organizationId;
  const canEdit = ["SUPER_ADMIN", "FLEET_ADMIN", "DISPATCHER"].includes(session?.user?.role ?? "");

  const { vehicle: vehicleId, search } = await searchParams;

  const entries = await prisma.fuelEntry.findMany({
    where: {
      vehicle: { ...(orgId ? { organizationId: orgId } : {}) },
      ...(vehicleId ? { vehicleId } : {}),
      ...(search
        ? {
            OR: [
              { location: { contains: search, mode: "insensitive" } },
              { vehicle: { registrationNumber: { contains: search, mode: "insensitive" } } },
              { vehicle: { make: { contains: search, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    include: {
      vehicle: {
        select: { id: true, registrationNumber: true, make: true, model: true },
      },
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });

  // Stats
  const totalLiters = entries.reduce((s, e) => s + (e.fuelLiters ? Number(e.fuelLiters) : 0), 0);
  const totalCost = entries.reduce((s, e) => s + (e.totalAmount ? Number(e.totalAmount) : 0), 0);
  const totalKm = entries.reduce((s, e) => s + (e.odometerDeltaKm ?? 0), 0);
  const avgConsumption =
    totalKm > 0 && totalLiters > 0 ? (totalLiters / totalKm) * 100 : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Gorivo i kilometraža</h1>
          <p className="text-muted-foreground">
            {entries.length} unos{entries.length === 1 ? "" : "a"}
            {vehicleId ? " za odabrano vozilo" : ""}
            {totalCost > 0 && ` · ${fmtMoney(totalCost)} ukupno`}
          </p>
        </div>
        {canEdit && (
          <ButtonLink href={`/dashboard/fuel/new${vehicleId ? `?vehicle=${vehicleId}` : ""}`}>
            <Plus className="size-4" />
            Novo sipanje
          </ButtonLink>
        )}
      </div>

      {/* Stats */}
      {entries.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Ukupno litara</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{fmtNum(totalLiters, 0)} L</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Ukupan trošak</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{fmtMoney(totalCost)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pređeni km (period)</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{fmtNum(totalKm)} km</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <TrendingDown className="size-4" /> Prosečna potrošnja
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {avgConsumption ? `${avgConsumption.toFixed(1)} L/100km` : "—"}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search */}
      <div className="flex flex-wrap items-center gap-3">
        <form method="GET" action="/dashboard/fuel" className="flex flex-1 min-w-0">
          {vehicleId && <input type="hidden" name="vehicle" value={vehicleId} />}
          <input
            name="search"
            defaultValue={search}
            placeholder="Pretraži vozilo, lokaciju..."
            className="h-9 w-full max-w-xs rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </form>
        {vehicleId && (
          <Link href="/dashboard/fuel">
            <Badge variant="outline" className="cursor-pointer">Sva vozila</Badge>
          </Link>
        )}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
              <Search className="mb-3 size-10 opacity-30" />
              <p className="font-medium">Nema unosa goriva</p>
              <p className="text-sm">
                {search ? "Pokušaj sa drugim pojmom." : "Dodaj prvo sipanje."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Datum</TableHead>
                  <TableHead>Vozilo</TableHead>
                  <TableHead>Km stanje</TableHead>
                  <TableHead>Pređeno</TableHead>
                  <TableHead>Količina</TableHead>
                  <TableHead>Cena/L</TableHead>
                  <TableHead>Ukupno</TableHead>
                  <TableHead>L/100km</TableHead>
                  <TableHead>Lokacija</TableHead>
                  <TableHead className="w-16" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((e) => {
                  const consumption =
                    e.odometerDeltaKm && e.odometerDeltaKm > 0 && e.fuelLiters
                      ? (Number(e.fuelLiters) / e.odometerDeltaKm) * 100
                      : null;

                  return (
                    <TableRow key={e.id} className="hover:bg-muted/50">
                      <TableCell className="text-sm">{fmtDate(e.date)}</TableCell>
                      <TableCell>
                        <Link
                          href={`/dashboard/vehicles/${e.vehicle.id}`}
                          className="font-mono font-medium text-primary hover:underline"
                        >
                          {e.vehicle.registrationNumber}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {e.vehicle.make} {e.vehicle.model}
                        </p>
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        {fmtNum(e.odometerKm)} km
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {e.odometerDeltaKm ? `+${fmtNum(e.odometerDeltaKm)} km` : "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {e.fuelLiters ? `${fmtNum(e.fuelLiters, 1)} L` : "—"}
                        {e.fuelType && (
                          <p className="text-xs text-muted-foreground">{e.fuelType}</p>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {e.pricePerLiter ? `${fmtNum(e.pricePerLiter, 2)}` : "—"}
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        {e.totalAmount ? fmtMoney(e.totalAmount) : "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {consumption ? (
                          <span
                            className={
                              consumption > 35
                                ? "text-red-500 font-medium"
                                : consumption > 25
                                ? "text-orange-500"
                                : ""
                            }
                          >
                            {consumption.toFixed(1)}
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground truncate max-w-32">
                        {e.location ?? "—"}
                      </TableCell>
                      <TableCell>
                        <ButtonLink href={`/dashboard/fuel/${e.id}`} variant="ghost" size="sm">
                          Detalji
                        </ButtonLink>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
