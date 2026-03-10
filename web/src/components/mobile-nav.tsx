"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, LayoutDashboard, Truck, Users, FileText, Wrench, Fuel, Bell, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";

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

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex md:hidden items-center gap-3 border-b px-4 h-14 bg-sidebar">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="text-sidebar-foreground">
            <Menu className="size-5" />
            <span className="sr-only">Otvori meni</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-56 p-0 bg-sidebar">
          <div className="flex h-14 items-center gap-2 px-4">
            <span className="font-semibold text-sidebar-foreground">Fleet Status</span>
          </div>
          <Separator />
          <nav className="flex-1 space-y-1 p-2">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            ))}
          </nav>
        </SheetContent>
      </Sheet>
      <span className="font-semibold text-sidebar-foreground">Fleet Status</span>
    </div>
  );
}
