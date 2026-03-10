import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button-link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { DriverStatusBadge } from "@/components/drivers/driver-status-badge";
import { DocStatusBadge } from "@/components/vehicles/doc-status-badge";
import { DriversSearch } from "@/components/drivers/drivers-search";
import { Plus, Search } from "lucide-react";

export default async function DriversPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string }>;
}) {
  const session = await auth();
  const orgId = session?.user?.organizationId;
  const { search, status } = await searchParams;

  const drivers = await prisma.driver.findMany({
    where: {
      ...(orgId ? { organizationId: orgId } : {}),
      ...(status ? { employmentStatus: status } : {}),
      ...(search
        ? {
            OR: [
              { firstName: { contains: search, mode: "insensitive" } },
              { lastName: { contains: search, mode: "insensitive" } },
              { licenseNumber: { contains: search, mode: "insensitive" } },
              { phone: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: {
      assignments: {
        where: { status: "active", type: "vehicle" },
        include: {
          vehicle: { select: { id: true, registrationNumber: true, make: true, model: true } },
        },
        take: 1,
      },
      _count: { select: { alerts: { where: { status: "active" } } } },
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  const canEdit = ["SUPER_ADMIN", "FLEET_ADMIN"].includes(session?.user?.role ?? "");
  const total = drivers.length;
  const active = drivers.filter((d) => d.employmentStatus === "active").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Vozači</h1>
          <p className="text-muted-foreground">
            {total} vozač{total === 1 ? "" : "a"} ukupno — {active} aktivnih
          </p>
        </div>
        {canEdit && (
          <ButtonLink href="/dashboard/drivers/new">
            <Plus className="size-4" />
            Novi vozač
          </ButtonLink>
        )}
      </div>

      {/* Filteri */}
      <div className="flex flex-wrap items-center gap-3">
        <DriversSearch defaultValue={search} />
        <div className="flex gap-2">
          {[
            { value: "", label: "Svi" },
            { value: "active", label: "Aktivni" },
            { value: "inactive", label: "Neaktivni" },
            { value: "terminated", label: "Prestali" },
          ].map((s) => (
            <Link
              key={s.value}
              href={`/dashboard/drivers${s.value ? `?status=${s.value}` : ""}${search ? `${s.value ? "&" : "?"}search=${search}` : ""}`}
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

      {/* Tabela */}
      <Card>
        <CardContent className="p-0">
          {drivers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
              <Search className="mb-3 size-10 opacity-30" />
              <p className="font-medium">Nema vozača</p>
              <p className="text-sm">
                {search ? "Pokušaj sa drugim pojmom." : "Dodaj prvog vozača."}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ime i prezime</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Vozilo</TableHead>
                  <TableHead>Br. dozvole</TableHead>
                  <TableHead>Vozačka dozvola</TableHead>
                  <TableHead>Lična karta</TableHead>
                  <TableHead>Alarmi</TableHead>
                  <TableHead className="w-16" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {drivers.map((d) => {
                  const activeVehicle = d.assignments[0]?.vehicle;
                  return (
                    <TableRow key={d.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell>
                        <Link href={`/dashboard/drivers/${d.id}`} className="hover:underline font-medium">
                          {d.lastName} {d.firstName}
                        </Link>
                        {d.jobTitle && (
                          <p className="text-xs text-muted-foreground">{d.jobTitle}</p>
                        )}
                      </TableCell>
                      <TableCell>
                        <DriverStatusBadge status={d.employmentStatus} />
                      </TableCell>
                      <TableCell>
                        {activeVehicle ? (
                          <Link
                            href={`/dashboard/vehicles/${activeVehicle.id}`}
                            className="font-mono text-sm hover:underline"
                          >
                            {activeVehicle.registrationNumber}
                          </Link>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {d.licenseNumber ?? "—"}
                      </TableCell>
                      <TableCell>
                        <DocStatusBadge validTo={d.licenseExpiry} />
                      </TableCell>
                      <TableCell>
                        <DocStatusBadge validTo={d.idCardExpiry} />
                      </TableCell>
                      <TableCell>
                        {d._count.alerts > 0 ? (
                          <Badge variant="destructive" className="text-xs">
                            {d._count.alerts}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <ButtonLink href={`/dashboard/drivers/${d.id}`} variant="ghost" size="sm">
                          Detalji
                        </ButtonLink>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
