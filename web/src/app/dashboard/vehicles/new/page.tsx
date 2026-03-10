import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { VehicleForm } from "@/components/vehicles/vehicle-form";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default async function NewVehiclePage() {
  const session = await auth();
  const role = session?.user?.role ?? "";

  if (!["SUPER_ADMIN", "FLEET_ADMIN"].includes(role)) {
    redirect("/dashboard/vehicles");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <Link href="/dashboard/vehicles" className="hover:text-foreground flex items-center gap-1">
          <ChevronLeft className="size-4" /> Vozila
        </Link>
        <span>/</span>
        <span className="text-foreground">Novo vozilo</span>
      </div>
      <div>
        <h1 className="text-2xl font-semibold">Novo vozilo</h1>
        <p className="text-muted-foreground">Unesite podatke o novom vozilu</p>
      </div>
      <VehicleForm mode="create" />
    </div>
  );
}
