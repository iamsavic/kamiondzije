import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
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
import { ChevronLeft, Pencil, MapPin, Gauge, Receipt } from "lucide-react";
import { STATUS_LABELS, STATUS_CLASS } from "@/lib/travel-order-status";
import { TravelOrderActions } from "@/components/travel-orders/travel-order-actions";

function fmtDate(v: Date | string | null | undefined) {
  if (!v) return "—";
  return new Date(v).toLocaleString("sr-Latn-RS", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtNum(v: unknown) {
  if (v === null || v === undefined) return "—";
  return Number(v).toLocaleString("sr-RS");
}

function fmtMoney(v: unknown, currency = "RSD") {
  if (v === null || v === undefined) return "—";
  return `${Number(v).toLocaleString("sr-RS", { minimumFractionDigits: 2 })} ${currency}`;
}

export default async function TravelOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const { id } = await params;
  const orgId = session?.user?.organizationId;
  const role = session?.user?.role ?? "";
  const canEdit = ["SUPER_ADMIN", "FLEET_ADMIN", "DISPATCHER"].includes(role);
  const canDelete = ["SUPER_ADMIN", "FLEET_ADMIN"].includes(role);

  const order = await prisma.travelOrder.findFirst({
    where: { id, ...(orgId ? { organizationId: orgId } : {}) },
    include: {
      driver: { select: { id: true, firstName: true, lastName: true } },
      vehicle: {
        select: { id: true, registrationNumber: true, make: true, model: true, status: true },
      },
      expenses: true,
    },
  });

  if (!order) notFound();

  const totalExpenses = order.expenses.reduce((s, ex) => s + Number(ex.amount), 0);

  const duration =
    order.departureAt && order.returnAt
      ? (() => {
          const ms = new Date(order.returnAt).getTime() - new Date(order.departureAt).getTime();
          const hours = Math.floor(ms / 3600000);
          const mins = Math.floor((ms % 3600000) / 60000);
          return `${hours}h ${mins}min`;
        })()
      : null;

  const isEditable = ["draft", "approved"].includes(order.status);

  return (
    <div className="space-y-6">
      {/* Breadcrumb & header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link
              href="/dashboard/travel-orders"
              className="flex items-center gap-1 hover:text-foreground"
            >
              <ChevronLeft className="size-4" /> Putni nalozi
            </Link>
            <span>/</span>
            <span className="font-mono text-foreground">{order.orderNumber}</span>
          </div>
          <h1 className="text-2xl font-semibold truncate">
            {order.route ?? order.purpose ?? order.orderNumber}
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm text-muted-foreground">{order.orderNumber}</span>
            <Badge
              variant="outline"
              className={`text-xs ${STATUS_CLASS[order.status] ?? ""}`}
            >
              {STATUS_LABELS[order.status] ?? order.status}
            </Badge>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 shrink-0">
          {canEdit && isEditable && (
            <ButtonLink
              href={`/dashboard/travel-orders/${id}/edit`}
              variant="outline"
              size="sm"
            >
              <Pencil className="size-4" /> Izmeni
            </ButtonLink>
          )}
          {canEdit && (
            <TravelOrderActions
              orderId={id}
              status={order.status}
              startOdometer={order.startOdometer}
              canDelete={canDelete}
            />
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Osnovni podaci */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="size-5 text-muted-foreground" /> Podaci o putu
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 text-sm">
              <dt className="text-muted-foreground">Vozač</dt>
              <dd>
                <Link
                  href={`/dashboard/drivers/${order.driver.id}`}
                  className="text-primary hover:underline"
                >
                  {order.driver.firstName} {order.driver.lastName}
                </Link>
              </dd>

              <dt className="text-muted-foreground">Vozilo</dt>
              <dd>
                <Link
                  href={`/dashboard/vehicles/${order.vehicle.id}`}
                  className="font-mono text-primary hover:underline"
                >
                  {order.vehicle.registrationNumber}
                </Link>
                <span className="ml-1 text-muted-foreground text-xs">
                  {order.vehicle.make} {order.vehicle.model}
                </span>
              </dd>

              <dt className="text-muted-foreground">Relacija</dt>
              <dd>{order.route ?? "—"}</dd>

              <dt className="text-muted-foreground">Svrha</dt>
              <dd>{order.purpose ?? "—"}</dd>

              <dt className="text-muted-foreground">Polazak</dt>
              <dd>{fmtDate(order.departureAt)}</dd>

              <dt className="text-muted-foreground">Povratak</dt>
              <dd>{fmtDate(order.returnAt)}</dd>

              {duration && (
                <>
                  <dt className="text-muted-foreground">Trajanje</dt>
                  <dd className="font-medium">{duration}</dd>
                </>
              )}

              {order.notes && (
                <>
                  <dt className="text-muted-foreground">Napomena</dt>
                  <dd className="text-xs col-span-2 -mt-1">{order.notes}</dd>
                </>
              )}
            </dl>
          </CardContent>
        </Card>

        {/* Kilometraža */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gauge className="size-5 text-muted-foreground" /> Kilometraža i gorivo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 text-sm">
              <dt className="text-muted-foreground">Početna km</dt>
              <dd>{order.startOdometer ? `${fmtNum(order.startOdometer)} km` : "—"}</dd>

              <dt className="text-muted-foreground">Završna km</dt>
              <dd>{order.endOdometer ? `${fmtNum(order.endOdometer)} km` : "—"}</dd>

              <dt className="text-muted-foreground">Pređeno</dt>
              <dd className="text-xl font-bold text-primary">
                {order.distanceKm ? `${fmtNum(order.distanceKm)} km` : "—"}
              </dd>

              <dt className="text-muted-foreground">Gorivo utošeno</dt>
              <dd>
                {order.fuelUsed ? `${Number(order.fuelUsed).toFixed(1)} L` : "—"}
              </dd>

              {order.fuelUsed && order.distanceKm && order.distanceKm > 0 && (
                <>
                  <dt className="text-muted-foreground">Potrošnja</dt>
                  <dd className="font-medium">
                    {((Number(order.fuelUsed) / order.distanceKm) * 100).toFixed(1)} L/100km
                  </dd>
                </>
              )}
            </dl>
          </CardContent>
        </Card>
      </div>

      {/* Troškovi */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="size-5 text-muted-foreground" /> Troškovi puta
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {order.expenses.length === 0 ? (
            <p className="px-6 py-6 text-center text-sm text-muted-foreground">
              Nema unesenih troškova.
            </p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Opis</TableHead>
                    <TableHead className="text-right w-36">Iznos</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.expenses.map((ex) => (
                    <TableRow key={ex.id}>
                      <TableCell>{ex.description}</TableCell>
                      <TableCell className="text-right font-medium">
                        {fmtMoney(ex.amount, ex.currency)}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="border-t-2 font-bold">
                    <TableCell>Ukupno</TableCell>
                    <TableCell className="text-right">{fmtMoney(totalExpenses)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
