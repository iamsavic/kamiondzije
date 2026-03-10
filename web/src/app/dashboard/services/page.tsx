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
import { Plus, Search, Wrench } from "lucide-react";

const TYPE_LABELS: Record<string, string> = {
  routine: "Redovan",
  repair: "Vanredan",
  preventive: "Preventivni",
};

const TYPE_VARIANT: Record<string, string> = {
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

export default async function ServicesPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; vehicle?: string; search?: string }>;
}) {
  const session = await auth();
  const orgId = session?.user?.organizationId;
  const canEdit = ["SUPER_ADMIN", "FLEET_ADMIN", "DISPATCHER"].includes(session?.user?.role ?? "");

  const { type, vehicle: vehicleId, search } = await searchParams;

  const records = await prisma.serviceRecord.findMany({
    where: {
      vehicle: { ...(orgId ? { organizationId: orgId } : {}) },
      ...(vehicleId ? { vehicleId } : {}),
      ...(type ? { type } : {}),
      ...(search
        ? {
            OR: [
              { description: { contains: search, mode: "insensitive" } },
              { workshop: { contains: search, mode: "insensitive" } },
              { invoiceNumber: { contains: search, mode: "insensitive" } },
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
    orderBy: [{ sentAt: "desc" }, { createdAt: "desc" }],
  });

  // Stats
  const totalCost = records.reduce((sum, r) => sum + (r.invoiceAmount ? Number(r.invoiceAmount) : 0), 0);
  const withNextService = records.filter((r) => r.nextServiceDate).length;

  function buildHref(overrides: Record<string, string>) {
    const p: Record<string, string> = {
      ...(type ? { type } : {}),
      ...(vehicleId ? { vehicle: vehicleId } : {}),
      ...(search ? { search } : {}),
    };
    Object.assign(p, overrides);
    Object.keys(p).forEach((k) => { if (!p[k]) delete p[k]; });
    const qs = new URLSearchParams(p).toString();
    return `/dashboard/services${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Servisi i održavanje</h1>
          <p className="text-muted-foreground">
            {records.length} zapisa{vehicleId ? " za odabrano vozilo" : ""}
            {totalCost > 0 && ` · ${fmtMoney(totalCost)} ukupno`}
          </p>
        </div>
        {canEdit && (
          <ButtonLink
            href={`/dashboard/services/new${vehicleId ? `?vehicle=${vehicleId}` : ""}`}
          >
            <Plus className="size-4" />
            Novi servis
          </ButtonLink>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <form method="GET" action="/dashboard/services" className="flex">
          {vehicleId && <input type="hidden" name="vehicle" value={vehicleId} />}
          {type && <input type="hidden" name="type" value={type} />}
          <input
            name="search"
            defaultValue={search}
            placeholder="Pretraži opis, radionicu..."
            className="h-9 w-60 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </form>

        {/* Type filter */}
        <div className="flex gap-2">
          {[
            { value: "", label: "Svi tipovi" },
            { value: "routine", label: "Redovni" },
            { value: "repair", label: "Vanredni" },
            { value: "preventive", label: "Preventivni" },
          ].map((f) => (
            <Link key={f.value} href={buildHref({ type: f.value })}>
              <Badge
                variant={(type ?? "") === f.value ? "default" : "outline"}
                className="cursor-pointer"
              >
                {f.label}
              </Badge>
            </Link>
          ))}
        </div>

        {/* Summary stat */}
        {withNextService > 0 && (
          <span className="text-xs text-muted-foreground ml-auto">
            {withNextService} zapis{withNextService === 1 ? "" : "a"} sa planiranim sledećim servisom
          </span>
        )}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {records.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
              <Search className="mb-3 size-10 opacity-30" />
              <p className="font-medium">Nema servisnih zapisa</p>
              <p className="text-sm">
                {search ? "Pokušaj sa drugim pojmom." : "Dodaj prvi servisni zapis."}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vozilo</TableHead>
                  <TableHead>Tip</TableHead>
                  <TableHead>Opis</TableHead>
                  <TableHead>Radionica</TableHead>
                  <TableHead>Datum</TableHead>
                  <TableHead>Iznos</TableHead>
                  <TableHead>Sledeći servis</TableHead>
                  <TableHead className="w-16" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((r) => (
                  <TableRow key={r.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell>
                      <Link
                        href={`/dashboard/vehicles/${r.vehicle.id}`}
                        className="font-mono font-medium hover:underline text-primary"
                      >
                        {r.vehicle.registrationNumber}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {r.vehicle.make} {r.vehicle.model}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={TYPE_VARIANT[r.type] as "secondary" | "destructive" | "outline" ?? "outline"}
                        className="text-xs"
                      >
                        {TYPE_LABELS[r.type] ?? r.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-56">
                      <p className="truncate text-sm">{r.description ?? "—"}</p>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {r.workshop ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      <span>{fmtDate(r.sentAt)}</span>
                      {r.completedAt && r.completedAt !== r.sentAt && (
                        <p className="text-xs text-muted-foreground">
                          završen {fmtDate(r.completedAt)}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-sm font-medium">
                      {r.invoiceAmount ? fmtMoney(r.invoiceAmount) : "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {r.nextServiceDate ? (
                        <span>{fmtDate(r.nextServiceDate)}</span>
                      ) : r.nextServiceKm ? (
                        <span>{r.nextServiceKm.toLocaleString("sr-RS")} km</span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      <ButtonLink
                        href={`/dashboard/services/${r.id}`}
                        variant="ghost"
                        size="sm"
                      >
                        Detalji
                      </ButtonLink>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Stats by type */}
      {records.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { key: "routine", label: "Redovnih", icon: "🔧" },
            { key: "repair", label: "Vanrednih", icon: "⚠️" },
            { key: "preventive", label: "Preventivnih", icon: "✅" },
          ].map(({ key, label, icon }) => {
            const filtered = records.filter((r) => r.type === key);
            const cost = filtered.reduce(
              (s, r) => s + (r.invoiceAmount ? Number(r.invoiceAmount) : 0),
              0
            );
            return (
              <Card key={key}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <span>{icon}</span> {label}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{filtered.length}</p>
                  {cost > 0 && (
                    <p className="text-xs text-muted-foreground">{fmtMoney(cost)}</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
