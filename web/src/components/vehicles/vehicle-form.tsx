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
import { Separator } from "@/components/ui/separator";

type VehicleFormData = {
  registrationNumber: string;
  vin: string;
  make: string;
  model: string;
  year: string;
  fuelType: string;
  engineDisplacement: string;
  powerKw: string;
  firstRegistration: string;
  status: string;
  purchaseDate: string;
  purchasePrice: string;
  currentValue: string;
  acquisitionType: string;
  leasingCompany: string;
  leasingContractNo: string;
  leasingStart: string;
  leasingEnd: string;
  leasingMonthly: string;
  notes: string;
};

type Props = {
  vehicle?: Partial<VehicleFormData> & { id?: string };
  mode?: "create" | "edit";
};

const emptyForm: VehicleFormData = {
  registrationNumber: "",
  vin: "",
  make: "",
  model: "",
  year: new Date().getFullYear().toString(),
  fuelType: "Dizel",
  engineDisplacement: "",
  powerKw: "",
  firstRegistration: "",
  status: "active",
  purchaseDate: "",
  purchasePrice: "",
  currentValue: "",
  acquisitionType: "purchase",
  leasingCompany: "",
  leasingContractNo: "",
  leasingStart: "",
  leasingEnd: "",
  leasingMonthly: "",
  notes: "",
};

function toDateInput(val: string | Date | null | undefined): string {
  if (!val) return "";
  const d = typeof val === "string" ? new Date(val) : val;
  return d.toISOString().split("T")[0];
}

export function VehicleForm({ vehicle, mode = "create" }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<VehicleFormData>({
    ...emptyForm,
    ...vehicle,
    firstRegistration: toDateInput(vehicle?.firstRegistration),
    purchaseDate: toDateInput(vehicle?.purchaseDate),
    leasingStart: toDateInput(vehicle?.leasingStart),
    leasingEnd: toDateInput(vehicle?.leasingEnd),
  });

  const set = (key: keyof VehicleFormData) => (val: string | null) =>
    setForm((f) => ({ ...f, [key]: val ?? f[key] }));

  const handleChange =
    (key: keyof VehicleFormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const url =
        mode === "edit" && vehicle?.id
          ? `/api/vehicles/${vehicle.id}`
          : "/api/vehicles";
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
      toast.success(mode === "edit" ? "Vozilo ažurirano." : "Vozilo kreirano.");
      router.push(`/dashboard/vehicles/${saved.id}`);
      router.refresh();
    } catch {
      toast.error("Mrežna greška.");
    } finally {
      setLoading(false);
    }
  }

  const isLeasing = form.acquisitionType === "leasing";

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Osnovno */}
      <Card>
        <CardHeader>
          <CardTitle>Osnovni podaci</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="registrationNumber">Registarska oznaka *</Label>
            <Input
              id="registrationNumber"
              value={form.registrationNumber}
              onChange={handleChange("registrationNumber")}
              placeholder="BG-123-AB"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vin">Broj šasije (VIN)</Label>
            <Input id="vin" value={form.vin} onChange={handleChange("vin")} placeholder="WDB..." />
          </div>
          <div className="space-y-2">
            <Label htmlFor="make">Marka *</Label>
            <Input id="make" value={form.make} onChange={handleChange("make")} placeholder="Mercedes-Benz" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="model">Model *</Label>
            <Input id="model" value={form.model} onChange={handleChange("model")} placeholder="Actros 1845" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="year">Godište *</Label>
            <Input id="year" type="number" value={form.year} onChange={handleChange("year")} min={1980} max={2030} required />
          </div>
          <div className="space-y-2">
            <Label>Tip goriva</Label>
            <Select value={form.fuelType} onValueChange={set("fuelType")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["Dizel", "Benzin", "Plin (LPG)", "CNG", "Električni", "Hibridni"].map((f) => (
                  <SelectItem key={f} value={f}>{f}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="engineDisplacement">Kubikaža (cm³)</Label>
            <Input id="engineDisplacement" type="number" value={form.engineDisplacement} onChange={handleChange("engineDisplacement")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="powerKw">Snaga (kW)</Label>
            <Input id="powerKw" type="number" value={form.powerKw} onChange={handleChange("powerKw")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="firstRegistration">Datum prve registracije</Label>
            <Input id="firstRegistration" type="date" value={form.firstRegistration} onChange={handleChange("firstRegistration")} />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={set("status")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Aktivan</SelectItem>
                <SelectItem value="inactive">Neaktivan</SelectItem>
                <SelectItem value="in_service">U servisu</SelectItem>
                <SelectItem value="sold">Prodat</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Nabavka i vrednost */}
      <Card>
        <CardHeader>
          <CardTitle>Nabavka i vrednost</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label>Način nabavke</Label>
            <Select value={form.acquisitionType} onValueChange={set("acquisitionType")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="purchase">Kupovina</SelectItem>
                <SelectItem value="leasing">Lizing</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="purchaseDate">Datum nabavke</Label>
            <Input id="purchaseDate" type="date" value={form.purchaseDate} onChange={handleChange("purchaseDate")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="purchasePrice">Nabavna cena (€)</Label>
            <Input id="purchasePrice" type="number" value={form.purchasePrice} onChange={handleChange("purchasePrice")} step="0.01" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="currentValue">Trenutna vrednost (€)</Label>
            <Input id="currentValue" type="number" value={form.currentValue} onChange={handleChange("currentValue")} step="0.01" />
          </div>

          {isLeasing && (
            <>
              <div className="space-y-2">
                <Label htmlFor="leasingCompany">Lizing kompanija</Label>
                <Input id="leasingCompany" value={form.leasingCompany} onChange={handleChange("leasingCompany")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="leasingContractNo">Broj ugovora</Label>
                <Input id="leasingContractNo" value={form.leasingContractNo} onChange={handleChange("leasingContractNo")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="leasingStart">Početak lizinga</Label>
                <Input id="leasingStart" type="date" value={form.leasingStart} onChange={handleChange("leasingStart")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="leasingEnd">Kraj lizinga</Label>
                <Input id="leasingEnd" type="date" value={form.leasingEnd} onChange={handleChange("leasingEnd")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="leasingMonthly">Mesečna rata (€)</Label>
                <Input id="leasingMonthly" type="number" value={form.leasingMonthly} onChange={handleChange("leasingMonthly")} step="0.01" />
              </div>
            </>
          )}
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
              placeholder="Slobodne napomene o vozilu..."
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={loading}>
          {loading ? "Čuvanje..." : mode === "edit" ? "Sačuvaj izmene" : "Kreiraj vozilo"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Otkaži
        </Button>
      </div>
    </form>
  );
}
