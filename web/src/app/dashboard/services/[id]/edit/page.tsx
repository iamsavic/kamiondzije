import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { ServiceForm } from "@/components/services/service-form";

export default async function EditServicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = session.user.role;
  if (!["SUPER_ADMIN", "FLEET_ADMIN", "DISPATCHER"].includes(role)) {
    redirect("/dashboard/services");
  }

  const { id } = await params;
  const orgId = session.user.organizationId;

  const record = await prisma.serviceRecord.findFirst({
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

  if (!record) notFound();

  const vehicles = await prisma.vehicle.findMany({
    where: { ...(orgId ? { organizationId: orgId } : {}), status: { not: "sold" } },
    select: { id: true, registrationNumber: true, make: true, model: true },
    orderBy: { registrationNumber: "asc" },
  });

  // Make sure current vehicle is in the list even if sold
  if (!vehicles.find((v) => v.id === record.vehicleId)) {
    vehicles.unshift(record.vehicle);
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/dashboard/services" className="flex items-center gap-1 hover:text-foreground">
            <ChevronLeft className="size-4" /> Servisi
          </Link>
          <span>/</span>
          <Link href={`/dashboard/services/${id}`} className="hover:text-foreground">
            Detalji
          </Link>
          <span>/</span>
          <span className="text-foreground">Izmeni</span>
        </div>
        <h1 className="text-2xl font-semibold">Izmena servisnog zapisa</h1>
        <p className="text-sm text-muted-foreground">
          {record.vehicle.registrationNumber} — {record.vehicle.make} {record.vehicle.model}
        </p>
      </div>

      <ServiceForm
        vehicles={vehicles}
        service={{
          id: record.id,
          vehicleId: record.vehicleId,
          type: record.type,
          sentAt: record.sentAt?.toISOString(),
          completedAt: record.completedAt?.toISOString(),
          description: record.description ?? "",
          workshop: record.workshop ?? "",
          invoiceAmount: record.invoiceAmount ? String(record.invoiceAmount) : "",
          invoiceNumber: record.invoiceNumber ?? "",
          nextServiceKm: record.nextServiceKm ? String(record.nextServiceKm) : "",
          nextServiceDate: record.nextServiceDate?.toISOString(),
          notes: record.notes ?? "",
        }}
        mode="edit"
      />
    </div>
  );
}
