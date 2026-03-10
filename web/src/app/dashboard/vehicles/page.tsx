import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VehicleStatusBadge } from "@/components/vehicles/vehicle-status-badge";
import { DocStatusBadge } from "@/components/vehicles/doc-status-badge";
import { Plus, Search } from "lucide-react";
import { DOC_TYPE_LABELS } from "@/lib/doc-status";
import { VehiclesSearch } from "@/components/vehicles/vehicles-search";

export default async function VehiclesPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string }>;
}) {
  const session = await auth();
  const orgId = session?.user?.organizationId;
  const { search, status } = await searchParams;

  const vehicles = await prisma.vehicle.findMany({
    where: {
      ...(orgId ? { organizationId: orgId } : {}),
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { registrationNumber: { contains: search, mode: "insensitive" } },
              { make: { contains: search, mode: "insensitive" } },
              { model: { contains: search, mode: "insensitive" } },
              { vin: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: {
      documents: { orderBy: { validTo: "asc" } },
      assignments: {
        where: { status: "active", type: "vehicle" },
        include: { driver: { select: { id: true, firstName: true, lastName: true } } },
        take: 1,
      },
      _count: { select: { alerts: { where: { status: "active" } } } },
    },
    orderBy: { registrationNumber: "asc" },
  });

  const canEdit = ["SUPER_ADMIN", "FLEET_ADMIN"].includes(session?.user?.role ?? "");

  // Counts by status
  const counts = {
    total: vehicles.length,
    active: vehicles.filter((v) => v.status === "active").length,
    in_service: vehicles.filter((v) => v.status === "in_service").length,
    inactive: vehicles.filter((v) => v.status === "inactive").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Vozila</h1>
          <p className="text-muted-foreground">
            {counts.total} vozil{counts.total === 1 ? "o" : "a"} ukupno — {counts.active} aktivnih, {counts.in_service} u servisu
          </p>
        </div>
        {canEdit && (
          <ButtonLink href="/dashboard/vehicles/new">
            <Plus className="size-4" />
            Novo vozilo
          </ButtonLink>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <VehiclesSearch defaultValue={search} />
        <div className="flex gap-2">
          {[
            { value: "", label: "Sva" },
            { value: "active", label: "Aktivna" },
            { value: "in_service", label: "U servisu" },
            { value: "inactive", label: "Neaktivna" },
            { value: "sold", label: "Prodata" },
          ].map((s) => (
            <Link
              key={s.value}
              href={`/dashboard/vehicles${s.value ? `?status=${s.value}` : ""}${search ? `${s.value ? "&" : "?"}search=${search}` : ""}`}
            >
              <Badge
                variant={status === s.value || (!status && !s.value) ? "default" : "outline"}
                className="cursor-pointer"
              >
                {s.label}
              </Badge>
            </Link>
          ))}
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {vehicles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
              <Search className="mb-3 size-10 opacity-30" />
              <p className="font-medium">Nema vozila</p>
              <p className="text-sm">
                {search ? "Pokušaj sa drugim pojmom pretrage." : "Dodaj prvo vozilo."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Registracija</TableHead>
                  <TableHead>Vozilo</TableHead>
                  <TableHead>Godište</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Vozač</TableHead>
                  <TableHead>Registracija</TableHead>
                  <TableHead>Osiguranje</TableHead>
                  <TableHead>Alarmi</TableHead>
                  <TableHead className="w-16" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {vehicles.map((v) => {
                  const regDoc = v.documents.find((d) => d.type === "registration");
                  const insDoc = v.documents.find((d) => d.type === "insurance");
                  const activeDriver = v.assignments[0]?.driver;

                  return (
                    <TableRow key={v.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell className="font-mono font-medium">
                        <Link href={`/dashboard/vehicles/${v.id}`} className="hover:underline">
                          {v.registrationNumber}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link href={`/dashboard/vehicles/${v.id}`} className="hover:underline">
                          {v.make} {v.model}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{v.year}</TableCell>
                      <TableCell>
                        <VehicleStatusBadge status={v.status} />
                      </TableCell>
                      <TableCell>
                        {activeDriver ? (
                          <span className="text-sm">
                            {activeDriver.firstName} {activeDriver.lastName}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {regDoc ? (
                          <DocStatusBadge validTo={regDoc.validTo} />
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">Nije uneseno</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {insDoc ? (
                          <DocStatusBadge validTo={insDoc.validTo} />
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">Nije uneseno</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {v._count.alerts > 0 ? (
                          <Badge variant="destructive" className="text-xs">
                            {v._count.alerts}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <ButtonLink href={`/dashboard/vehicles/${v.id}`} variant="ghost" size="sm">
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
