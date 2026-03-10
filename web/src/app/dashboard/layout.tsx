import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { signOut } from "@/auth";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  LayoutDashboard,
  Truck,
  Users,
  FileText,
  Wrench,
  Fuel,
  Bell,
  Settings,
  LogOut,
} from "lucide-react";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/vehicles", label: "Vozila", icon: Truck },
  { href: "/dashboard/drivers", label: "Vozači", icon: Users },
  { href: "/dashboard/travel-orders", label: "Putni nalozi", icon: FileText },
  { href: "/dashboard/services", label: "Servisi", icon: Wrench },
  { href: "/dashboard/fuel", label: "Gorivo", icon: Fuel },
  { href: "/dashboard/alerts", label: "Alarmi", icon: Bell },
  { href: "/dashboard/settings", label: "Podešavanja", icon: Settings },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-56 flex-col border-r border-sidebar-border bg-sidebar">
        <div className="flex h-14 items-center gap-2 px-4">
          <span className="font-semibold text-sidebar-foreground">
            Fleet Status
          </span>
        </div>
        <Separator />
        <nav className="flex-1 space-y-1 p-2">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          ))}
        </nav>
        <Separator />
        <div className="p-2">
          <p className="truncate px-3 text-xs text-muted-foreground">
            {session.user.email}
          </p>
          {session.user.organizationName && (
            <p className="truncate px-3 text-xs text-muted-foreground">
              {session.user.organizationName}
            </p>
          )}
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
            className="mt-2"
          >
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 text-muted-foreground"
            >
              <LogOut className="size-4" />
              Odjavi se
            </Button>
          </form>
        </div>
      </aside>
      <main className="flex-1 overflow-auto bg-background p-6">
        {children}
      </main>
    </div>
  );
}
