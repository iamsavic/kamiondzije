import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { DriverForm } from "@/components/drivers/driver-form";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default async function NewDriverPage() {
  const session = await auth();
  if (!["SUPER_ADMIN", "FLEET_ADMIN"].includes(session?.user?.role ?? "")) {
    redirect("/dashboard/drivers");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <Link href="/dashboard/drivers" className="hover:text-foreground flex items-center gap-1">
          <ChevronLeft className="size-4" /> Vozači
        </Link>
        <span>/</span>
        <span className="text-foreground">Novi vozač</span>
      </div>
      <div>
        <h1 className="text-2xl font-semibold">Novi vozač</h1>
        <p className="text-muted-foreground">Unesite podatke o novom vozaču</p>
      </div>
      <DriverForm mode="create" />
    </div>
  );
}
