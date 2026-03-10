import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { FuelForm } from "@/components/fuel/fuel-form";

export default async function EditFuelPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = session.user.role;
  if (!["SUPER_ADMIN", "FLEET_ADMIN", "DISPATCHER"].includes(role)) {
    redirect("/dashboard/fuel");
  }

  const { id } = await params;
  const orgId = session.user.organizationId;

  const entry = await prisma.fuelEntry.findFirst({
    where: {
      id,
      vehicle: { ...(orgId ? { organizationId: orgId } : {}) },
    },
    include: {
      vehicle: {
        select: { id: true, registrationNumber: true, make: true, model: true },
      },
    },
  });

  if (!entry) notFound();

  const vehicles = await prisma.vehicle.findMany({
    where: { ...(orgId ? { organizationId: orgId } : {}), status: { not: "sold" } },
    select: { id: true, registrationNumber: true, make: true, model: true },
    orderBy: { registrationNumber: "asc" },
  });

  if (!vehicles.find((v) => v.id === entry.vehicleId)) {
    vehicles.unshift(entry.vehicle);
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/dashboard/fuel" className="flex items-center gap-1 hover:text-foreground">
            <ChevronLeft className="size-4" /> Gorivo
          </Link>
          <span>/</span>
          <Link href={`/dashboard/fuel/${id}`} className="hover:text-foreground">Detalji</Link>
          <span>/</span>
          <span className="text-foreground">Izmeni</span>
        </div>
        <h1 className="text-2xl font-semibold">Izmena unosa sipanja</h1>
        <p className="text-sm text-muted-foreground">
          {entry.vehicle.registrationNumber} — {entry.vehicle.make} {entry.vehicle.model}
        </p>
      </div>

      <FuelForm
        vehicles={vehicles}
        entry={{
          id: entry.id,
          vehicleId: entry.vehicleId,
          date: entry.date.toISOString(),
          odometerKm: String(entry.odometerKm),
          fuelLiters: entry.fuelLiters ? String(entry.fuelLiters) : "",
          pricePerLiter: entry.pricePerLiter ? String(entry.pricePerLiter) : "",
          totalAmount: entry.totalAmount ? String(entry.totalAmount) : "",
          location: entry.location ?? "",
          fuelType: entry.fuelType ?? "",
          notes: entry.notes ?? "",
        }}
        mode="edit"
      />
    </div>
  );
}
