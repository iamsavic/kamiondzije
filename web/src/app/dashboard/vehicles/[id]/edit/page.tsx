import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { VehicleForm } from "@/components/vehicles/vehicle-form";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default async function EditVehiclePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const role = session?.user?.role ?? "";
  if (!["SUPER_ADMIN", "FLEET_ADMIN"].includes(role)) redirect("/dashboard/vehicles");

  const { id } = await params;
  const orgId = session?.user?.organizationId;

  const vehicle = await prisma.vehicle.findFirst({
    where: { id, ...(orgId ? { organizationId: orgId } : {}) },
  });
  if (!vehicle) notFound();

  // Serialize dates to strings for client component
  const vehicleData = {
    id: vehicle.id,
    registrationNumber: vehicle.registrationNumber,
    vin: vehicle.vin ?? "",
    make: vehicle.make,
    model: vehicle.model,
    year: vehicle.year.toString(),
    fuelType: vehicle.fuelType ?? "",
    engineDisplacement: vehicle.engineDisplacement?.toString() ?? "",
    powerKw: vehicle.powerKw?.toString() ?? "",
    firstRegistration: vehicle.firstRegistration?.toISOString() ?? "",
    status: vehicle.status,
    purchaseDate: vehicle.purchaseDate?.toISOString() ?? "",
    purchasePrice: vehicle.purchasePrice?.toString() ?? "",
    currentValue: vehicle.currentValue?.toString() ?? "",
    acquisitionType: vehicle.acquisitionType ?? "purchase",
    leasingCompany: vehicle.leasingCompany ?? "",
    leasingContractNo: vehicle.leasingContractNo ?? "",
    leasingStart: vehicle.leasingStart?.toISOString() ?? "",
    leasingEnd: vehicle.leasingEnd?.toISOString() ?? "",
    leasingMonthly: vehicle.leasingMonthly?.toString() ?? "",
    notes: vehicle.notes ?? "",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <Link href="/dashboard/vehicles" className="hover:text-foreground flex items-center gap-1">
          <ChevronLeft className="size-4" /> Vozila
        </Link>
        <span>/</span>
        <Link href={`/dashboard/vehicles/${id}`} className="hover:text-foreground font-mono">
          {vehicle.registrationNumber}
        </Link>
        <span>/</span>
        <span className="text-foreground">Izmena</span>
      </div>
      <div>
        <h1 className="text-2xl font-semibold">Izmena vozila</h1>
        <p className="text-muted-foreground">
          {vehicle.make} {vehicle.model} — {vehicle.registrationNumber}
        </p>
      </div>
      <VehicleForm mode="edit" vehicle={vehicleData} />
    </div>
  );
}
