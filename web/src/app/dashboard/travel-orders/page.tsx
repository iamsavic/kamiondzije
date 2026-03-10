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
import { Plus, Search } from "lucide-react";
import { STATUS_LABELS, STATUS_CLASS } from "@/lib/travel-order-status";

function fmtDate(v: Date | string | null | undefined) {
  if (!v) return "—";
  return new Date(v).toLocaleDateString("sr-Latn-RS");
}

function fmtMoney(v: number) {
  if (!v) return "—";
  return `${v.toLocaleString("sr-RS", { minimumFractionDigits: 0 })} RSD`;
}

export default async function TravelOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; search?: string }>;
}) {
  const session = await auth();
  const orgId = session?.user?.organizationId;
  const canEdit = ["SUPER_ADMIN", "FLEET_ADMIN", "DISPATCHER"].includes(
    session?.user?.role ?? ""
  );

  const { status, search } = await searchParams;

  const orders = await prisma.travelOrder.findMany({
    where: {
      ...(orgId ? { organizationId: orgId } : {}),
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { orderNumber: { contains: search, mode: "insensitive" } },
              { route: { contains: search, mode: "insensitive" } },
              { purpose: { contains: search, mode: "insensitive" } },
              { driver: { firstName: { contains: search, mode: "insensitive" } } },
              { driver: { lastName: { contains: search, mode: "insensitive" } } },
              { vehicle: { registrationNumber: { contains: search, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    include: {
      driver: { select: { id: true, firstName: true, lastName: true } },
      vehicle: { select: { id: true, registrationNumber: true, make: true, model: true } },
      expenses: { select: { amount: true, currency: true } },
    },
    orderBy: [{ departureAt: "desc" }, { createdAt: "desc" }],
  });

  // Counts by status
  const counts = await prisma.travelOrder.groupBy({
    by: ["status"],
    where: orgId ? { organizationId: orgId } : {},
    _count: true,
  });
  const countMap = Object.fromEntries(counts.map((c) => [c.status, c._count]));

  const statusTabs = [
    { value: "", label: "Svi" },
    { value: "draft", label: "Nacrti" },
    { value: "approved", label: "Odobreni" },
    { value: "completed", label: "Završeni" },
    { value: "cancelled", label: "Otkazani" },
  ];

  function buildHref(overrides: Record<string, string>) {
    const p: Record<string, string> = {
      ...(status ? { status } : {}),
      ...(search ? { search } : {}),
    };
    Object.assign(p, overrides);
    Object.keys(p).forEach((k) => { if (!p[k]) delete p[k]; });
    const qs = new URLSearchParams(p).toString();
    return `/dashboard/travel-orders${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Putni nalozi</h1>
          <p className="text-muted-foreground">
            {orders.length} nalog{orders.length === 1 ? "" : "a"}
            {countMap["draft"] ? ` · ${countMap["draft"]} nacrta` : ""}
          </p>
        </div>
        {canEdit && (
          <ButtonLink href="/dashboard/travel-orders/new">
            <Plus className="size-4" />
            Novi nalog
          </ButtonLink>
        )}
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { key: "draft", label: "Nacrti", color: "text-muted-foreground" },
          { key: "approved", label: "Odobreni", color: "text-blue-600" },
          { key: "completed", label: "Završeni", color: "text-green-600" },
          { key: "cancelled", label: "Otkazani", color: "text-red-500" },
        ].map(({ key, label, color }) => (
          <Link key={key} href={buildHref({ status: key })}>
            <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
              <CardHeader className="pb-2">
                <CardTitle className={`text-sm font-medium ${color}`}>{label}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{countMap[key] ?? 0}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <form method="GET" action="/dashboard/travel-orders" className="flex">
          {status && <input type="hidden" name="status" value={status} />}
          <input
            name="search"
            defaultValue={search}
            placeholder="Pretraži nalog, relaciju, vozača..."
            className="h-9 w-full max-w-xs rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </form>

        <div className="flex flex-wrap gap-2">
          {statusTabs.map((tab) => (
            <Link key={tab.value} href={buildHref({ status: tab.value })}>
              <Badge
                variant={(status ?? "") === tab.value ? "default" : "outline"}
                className="cursor-pointer"
              >
                {tab.label}
                {tab.value && (countMap[tab.value] ?? 0) > 0 && (
                  <span className="ml-1 text-xs opacity-70">{countMap[tab.value]}</span>
                )}
              </Badge>
            </Link>
          ))}
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
              <Search className="mb-3 size-10 opacity-30" />
              <p className="font-medium">Nema putnih naloga</p>
              <p className="text-sm">
                {search ? "Pokušaj sa drugim pojmom." : "Kreiraj prvi putni nalog."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Broj naloga</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Vozač</TableHead>
                  <TableHead>Vozilo</TableHead>
                  <TableHead>Relacija</TableHead>
                  <TableHead>Polazak</TableHead>
                  <TableHead>Km</TableHead>
                  <TableHead>Troškovi</TableHead>
                  <TableHead className="w-16" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((o) => {
                  const totalExpenses = o.expenses.reduce(
                    (s, ex) => s + Number(ex.amount),
                    0
                  );
                  return (
                    <TableRow key={o.id} className="hover:bg-muted/50">
                      <TableCell className="font-mono text-sm font-medium">
                        <Link
                          href={`/dashboard/travel-orders/${o.id}`}
                          className="hover:underline text-primary"
                        >
                          {o.orderNumber}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-xs ${STATUS_CLASS[o.status] ?? ""}`}
                        >
                          {STATUS_LABELS[o.status] ?? o.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        <Link
                          href={`/dashboard/drivers/${o.driver.id}`}
                          className="hover:underline"
                        >
                          {o.driver.firstName} {o.driver.lastName}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/dashboard/vehicles/${o.vehicle.id}`}
                          className="font-mono text-sm hover:underline text-primary"
                        >
                          {o.vehicle.registrationNumber}
                        </Link>
                      </TableCell>
                      <TableCell className="max-w-48 truncate text-sm">
                        {o.route ?? "—"}
                      </TableCell>
                      <TableCell className="text-sm">{fmtDate(o.departureAt)}</TableCell>
                      <TableCell className="text-sm">
                        {o.distanceKm
                          ? `${o.distanceKm.toLocaleString("sr-RS")} km`
                          : "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {totalExpenses > 0 ? fmtMoney(totalExpenses) : "—"}
                      </TableCell>
                      <TableCell>
                        <ButtonLink
                          href={`/dashboard/travel-orders/${o.id}`}
                          variant="ghost"
                          size="sm"
                        >
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
