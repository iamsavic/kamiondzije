import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { ServiceForm } from "@/components/services/service-form";

export default async function NewServicePage({
  searchParams,
}: {
  searchParams: Promise<{ vehicle?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = session.user.role;
  if (!["SUPER_ADMIN", "FLEET_ADMIN", "DISPATCHER"].includes(role)) {
    redirect("/dashboard/services");
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
          <Link href="/dashboard/services" className="flex items-center gap-1 hover:text-foreground">
            <ChevronLeft className="size-4" /> Servisi
          </Link>
          <span>/</span>
          <span className="text-foreground">Novi servisni zapis</span>
        </div>
        <h1 className="text-2xl font-semibold">Novi servisni zapis</h1>
      </div>

      <ServiceForm
        vehicles={vehicles}
        defaultVehicleId={defaultVehicleId}
        mode="create"
      />
    </div>
  );
}
