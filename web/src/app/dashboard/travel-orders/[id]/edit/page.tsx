import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { TravelOrderForm } from "@/components/travel-orders/travel-order-form";

export default async function EditTravelOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = session.user.role;
  if (!["SUPER_ADMIN", "FLEET_ADMIN", "DISPATCHER"].includes(role)) {
    redirect("/dashboard/travel-orders");
  }

  const { id } = await params;
  const orgId = session.user.organizationId;

  const order = await prisma.travelOrder.findFirst({
    where: { id, ...(orgId ? { organizationId: orgId } : {}) },
    include: {
      driver: { select: { id: true, firstName: true, lastName: true } },
      vehicle: { select: { id: true, registrationNumber: true, make: true, model: true } },
      expenses: true,
    },
  });

  if (!order) notFound();

  if (["completed", "cancelled"].includes(order.status)) {
    redirect(`/dashboard/travel-orders/${id}`);
  }

  const [vehicles, drivers] = await Promise.all([
    prisma.vehicle.findMany({
      where: { ...(orgId ? { organizationId: orgId } : {}), status: "active" },
      select: { id: true, registrationNumber: true, make: true, model: true },
      orderBy: { registrationNumber: "asc" },
    }),
    prisma.driver.findMany({
      where: { ...(orgId ? { organizationId: orgId } : {}), employmentStatus: "active" },
      select: { id: true, firstName: true, lastName: true },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    }),
  ]);

  // Ensure current driver and vehicle are in lists
  if (!vehicles.find((v) => v.id === order.vehicleId)) {
    vehicles.unshift(order.vehicle);
  }
  if (!drivers.find((d) => d.id === order.driverId)) {
    drivers.unshift(order.driver);
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link
            href="/dashboard/travel-orders"
            className="flex items-center gap-1 hover:text-foreground"
          >
            <ChevronLeft className="size-4" /> Putni nalozi
          </Link>
          <span>/</span>
          <Link href={`/dashboard/travel-orders/${id}`} className="hover:text-foreground font-mono">
            {order.orderNumber}
          </Link>
          <span>/</span>
          <span className="text-foreground">Izmeni</span>
        </div>
        <h1 className="text-2xl font-semibold">Izmena putnog naloga</h1>
        <p className="text-sm text-muted-foreground font-mono">{order.orderNumber}</p>
      </div>

      <TravelOrderForm
        vehicles={vehicles}
        drivers={drivers}
        order={{
          id: order.id,
          driverId: order.driverId,
          vehicleId: order.vehicleId,
          route: order.route ?? "",
          purpose: order.purpose ?? "",
          departureAt: order.departureAt?.toISOString(),
          returnAt: order.returnAt?.toISOString(),
          startOdometer: order.startOdometer ? String(order.startOdometer) : "",
          endOdometer: order.endOdometer ? String(order.endOdometer) : "",
          fuelUsed: order.fuelUsed ? String(order.fuelUsed) : "",
          notes: order.notes ?? "",
          expenses: order.expenses.map((ex) => ({
            description: ex.description,
            amount: String(ex.amount),
            currency: ex.currency,
          })),
        }}
        mode="edit"
      />
    </div>
  );
}
