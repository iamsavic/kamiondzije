import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { FuelForm } from "@/components/fuel/fuel-form";

export default async function NewFuelPage({
  searchParams,
}: {
  searchParams: Promise<{ vehicle?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = session.user.role;
  if (!["SUPER_ADMIN", "FLEET_ADMIN", "DISPATCHER"].includes(role)) {
    redirect("/dashboard/fuel");
  }

  const orgId = session.user.organizationId;
  const { vehicle: defaultVehicleId } = await searchParams;

  const vehicles = await prisma.vehicle.findMany({
    where: {
      ...(orgId ? { organizationId: orgId } : {}),
      status: { not: "sold" },
    },
    select: { id: true, registrationNumber: true, make: true, model: true },
    orderBy: { registrationNumber: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/dashboard/fuel" className="flex items-center gap-1 hover:text-foreground">
            <ChevronLeft className="size-4" /> Gorivo
          </Link>
          <span>/</span>
          <span className="text-foreground">Novo sipanje</span>
        </div>
        <h1 className="text-2xl font-semibold">Unos sipanja</h1>
      </div>

      <FuelForm vehicles={vehicles} defaultVehicleId={defaultVehicleId} mode="create" />
    </div>
  );
}
