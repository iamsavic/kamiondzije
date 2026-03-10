import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { DriverForm } from "@/components/drivers/driver-form";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default async function EditDriverPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!["SUPER_ADMIN", "FLEET_ADMIN"].includes(session?.user?.role ?? "")) {
    redirect("/dashboard/drivers");
  }

  const { id } = await params;
  const orgId = session?.user?.organizationId;

  const driver = await prisma.driver.findFirst({
    where: { id, ...(orgId ? { organizationId: orgId } : {}) },
  });
  if (!driver) notFound();

  const driverData = {
    id: driver.id,
    externalId: driver.externalId ?? "",
    firstName: driver.firstName,
    lastName: driver.lastName,
    phone: driver.phone ?? "",
    email: driver.email ?? "",
    address: driver.address ?? "",
    jobTitle: driver.jobTitle ?? "",
    employmentStartDate: driver.employmentStartDate?.toISOString() ?? "",
    employmentStatus: driver.employmentStatus,
    licenseNumber: driver.licenseNumber ?? "",
    licenseCategories: driver.licenseCategories ?? "",
    licenseExpiry: driver.licenseExpiry?.toISOString() ?? "",
    idCardNumber: driver.idCardNumber ?? "",
    idCardExpiry: driver.idCardExpiry?.toISOString() ?? "",
    notes: driver.notes ?? "",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <Link href="/dashboard/drivers" className="hover:text-foreground flex items-center gap-1">
          <ChevronLeft className="size-4" /> Vozači
        </Link>
        <span>/</span>
        <Link href={`/dashboard/drivers/${id}`} className="hover:text-foreground">
          {driver.firstName} {driver.lastName}
        </Link>
        <span>/</span>
        <span className="text-foreground">Izmena</span>
      </div>
      <div>
        <h1 className="text-2xl font-semibold">Izmena vozača</h1>
        <p className="text-muted-foreground">
          {driver.firstName} {driver.lastName}
        </p>
      </div>
      <DriverForm mode="edit" driver={driverData} />
    </div>
  );
}
