import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { TravelOrderForm } from "@/components/travel-orders/travel-order-form";

export default async function NewTravelOrderPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = session.user.role;
  if (!["SUPER_ADMIN", "FLEET_ADMIN", "DISPATCHER"].includes(role)) {
    redirect("/dashboard/travel-orders");
  }

  const orgId = session.user.organizationId;

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
          <span className="text-foreground">Novi nalog</span>
        </div>
        <h1 className="text-2xl font-semibold">Novi putni nalog</h1>
      </div>

      <TravelOrderForm vehicles={vehicles} drivers={drivers} mode="create" />
    </div>
  );
}
