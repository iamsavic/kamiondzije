"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type DriverFormData = {
  externalId: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  address: string;
  jobTitle: string;
  employmentStartDate: string;
  employmentStatus: string;
  licenseNumber: string;
  licenseCategories: string;
  licenseExpiry: string;
  idCardNumber: string;
  idCardExpiry: string;
  notes: string;
};

type Props = {
  driver?: Partial<DriverFormData> & { id?: string };
  mode?: "create" | "edit";
};

const emptyForm: DriverFormData = {
  externalId: "",
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  address: "",
  jobTitle: "",
  employmentStartDate: "",
  employmentStatus: "active",
  licenseNumber: "",
  licenseCategories: "",
  licenseExpiry: "",
  idCardNumber: "",
  idCardExpiry: "",
  notes: "",
};

function toDateInput(val: string | Date | null | undefined): string {
  if (!val) return "";
  const d = typeof val === "string" ? new Date(val) : val;
  if (isNaN(d.getTime())) return "";
  return d.toISOString().split("T")[0];
}

export function DriverForm({ driver, mode = "create" }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<DriverFormData>({
    ...emptyForm,
    ...driver,
    employmentStartDate: toDateInput(driver?.employmentStartDate),
    licenseExpiry: toDateInput(driver?.licenseExpiry),
    idCardExpiry: toDateInput(driver?.idCardExpiry),
  });

  const set = (key: keyof DriverFormData) => (val: string | null) =>
    setForm((f) => ({ ...f, [key]: val ?? f[key] }));

  const handleChange =
    (key: keyof DriverFormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const url =
        mode === "edit" && driver?.id
          ? `/api/drivers/${driver.id}`
          : "/api/drivers";
      const method = mode === "edit" ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error ?? "Greška pri čuvanju");
        return;
      }

      const saved = await res.json();
      toast.success(mode === "edit" ? "Vozač ažuriran." : "Vozač kreiran.");
      router.push(`/dashboard/drivers/${saved.id}`);
      router.refresh();
    } catch {
      toast.error("Mrežna greška.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Lični podaci */}
      <Card>
        <CardHeader><CardTitle>Lični podaci</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="firstName">Ime *</Label>
            <Input id="firstName" value={form.firstName} onChange={handleChange("firstName")} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Prezime *</Label>
            <Input id="lastName" value={form.lastName} onChange={handleChange("lastName")} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="externalId">JMBG / Interni ID</Label>
            <Input id="externalId" value={form.externalId} onChange={handleChange("externalId")} placeholder="1234567890123" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Telefon</Label>
            <Input id="phone" type="tel" value={form.phone} onChange={handleChange("phone")} placeholder="+381641234567" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={form.email} onChange={handleChange("email")} />
          </div>
          <div className="space-y-2 sm:col-span-2 lg:col-span-1">
            <Label htmlFor="address">Adresa</Label>
            <Input id="address" value={form.address} onChange={handleChange("address")} placeholder="Ulica br, Grad" />
          </div>
        </CardContent>
      </Card>

      {/* Zaposlenje */}
      <Card>
        <CardHeader><CardTitle>Zaposlenje</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="jobTitle">Radno mesto</Label>
            <Input id="jobTitle" value={form.jobTitle} onChange={handleChange("jobTitle")} placeholder="Vozač kategorije CE" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="employmentStartDate">Datum zaposlenja</Label>
            <Input id="employmentStartDate" type="date" value={form.employmentStartDate} onChange={handleChange("employmentStartDate")} />
          </div>
          <div className="space-y-2">
            <Label>Status zaposlenja</Label>
            <Select value={form.employmentStatus} onValueChange={set("employmentStatus")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Aktivan</SelectItem>
                <SelectItem value="inactive">Neaktivan</SelectItem>
                <SelectItem value="terminated">Prekinut radni odnos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Dokumenti */}
      <Card>
        <CardHeader><CardTitle>Dokumenta</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="licenseNumber">Broj vozačke dozvole</Label>
            <Input id="licenseNumber" value={form.licenseNumber} onChange={handleChange("licenseNumber")} placeholder="LIC-BG-000123" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="licenseCategories">Kategorije dozvole</Label>
            <Input id="licenseCategories" value={form.licenseCategories} onChange={handleChange("licenseCategories")} placeholder="B,C,CE" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="licenseExpiry">Vozačka — važi do</Label>
            <Input id="licenseExpiry" type="date" value={form.licenseExpiry} onChange={handleChange("licenseExpiry")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="idCardNumber">Broj lične karte</Label>
            <Input id="idCardNumber" value={form.idCardNumber} onChange={handleChange("idCardNumber")} placeholder="ID-BG-112233" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="idCardExpiry">Lična karta — važi do</Label>
            <Input id="idCardExpiry" type="date" value={form.idCardExpiry} onChange={handleChange("idCardExpiry")} />
          </div>
        </CardContent>
      </Card>

      {/* Napomena */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2">
            <Label htmlFor="notes">Napomena</Label>
            <textarea
              id="notes"
              value={form.notes}
              onChange={handleChange("notes")}
              rows={3}
              placeholder="Slobodne napomene..."
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={loading}>
          {loading ? "Čuvanje..." : mode === "edit" ? "Sačuvaj izmene" : "Kreiraj vozača"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Otkaži
        </Button>
      </div>
    </form>
  );
}
