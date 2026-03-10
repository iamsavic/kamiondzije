"use client";

import { useState, useEffect } from "react";
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

type Vehicle = { id: string; registrationNumber: string; make: string; model: string };

type FuelFormData = {
  vehicleId: string;
  date: string;
  odometerKm: string;
  fuelLiters: string;
  pricePerLiter: string;
  totalAmount: string;
  location: string;
  fuelType: string;
  notes: string;
};

type Props = {
  vehicles: Vehicle[];
  entry?: Partial<FuelFormData> & { id?: string };
  defaultVehicleId?: string;
  mode?: "create" | "edit";
};

const empty: FuelFormData = {
  vehicleId: "",
  date: new Date().toISOString().split("T")[0],
  odometerKm: "",
  fuelLiters: "",
  pricePerLiter: "",
  totalAmount: "",
  location: "",
  fuelType: "",
  notes: "",
};

function toDate(v: string | Date | null | undefined): string {
  if (!v) return "";
  const d = typeof v === "string" ? new Date(v) : v;
  return d.toISOString().split("T")[0];
}

export function FuelForm({ vehicles, entry, defaultVehicleId, mode = "create" }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<FuelFormData>({
    ...empty,
    vehicleId: defaultVehicleId ?? "",
    ...entry,
    date: toDate(entry?.date) || empty.date,
  });

  const set = (key: keyof FuelFormData) => (val: string | null) =>
    setForm((f) => ({ ...f, [key]: val ?? "" }));

  const handleChange =
    (key: keyof FuelFormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  // Auto-calculate totalAmount when liters and price change
  useEffect(() => {
    const liters = parseFloat(form.fuelLiters);
    const price = parseFloat(form.pricePerLiter);
    if (!isNaN(liters) && !isNaN(price) && liters > 0 && price > 0) {
      setForm((f) => ({ ...f, totalAmount: (liters * price).toFixed(2) }));
    }
  }, [form.fuelLiters, form.pricePerLiter]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.vehicleId) { toast.error("Odaberi vozilo."); return; }
    if (!form.odometerKm) { toast.error("Unesi stanje km."); return; }

    setLoading(true);
    try {
      const url =
        mode === "edit" && entry?.id
          ? `/api/fuel/${entry.id}`
          : "/api/fuel";
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
      toast.success(mode === "edit" ? "Unos ažuriran." : "Sipanje dodato.");
      router.push(`/dashboard/fuel/${saved.id}`);
      router.refresh();
    } catch {
      toast.error("Mrežna greška.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Podaci o sipanju</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Vozilo */}
          <div className="space-y-2">
            <Label>Vozilo *</Label>
            <Select
              value={form.vehicleId}
              onValueChange={set("vehicleId")}
              disabled={mode === "edit"}
            >
              <SelectTrigger>
                <SelectValue placeholder="Odaberi vozilo..." />
              </SelectTrigger>
              <SelectContent>
                {vehicles.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.registrationNumber} — {v.make} {v.model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Datum */}
          <div className="space-y-2">
            <Label htmlFor="date">Datum *</Label>
            <Input id="date" type="date" value={form.date} onChange={handleChange("date")} required />
          </div>

          {/* Km */}
          <div className="space-y-2">
            <Label htmlFor="odometerKm">Stanje km *</Label>
            <Input
              id="odometerKm"
              type="number"
              value={form.odometerKm}
              onChange={handleChange("odometerKm")}
              min="0"
              step="1"
              placeholder="125000"
              required
            />
          </div>

          {/* Liters */}
          <div className="space-y-2">
            <Label htmlFor="fuelLiters">Količina (L)</Label>
            <Input
              id="fuelLiters"
              type="number"
              value={form.fuelLiters}
              onChange={handleChange("fuelLiters")}
              min="0"
              step="0.01"
              placeholder="50.00"
            />
          </div>

          {/* Price per liter */}
          <div className="space-y-2">
            <Label htmlFor="pricePerLiter">Cena po litru (RSD)</Label>
            <Input
              id="pricePerLiter"
              type="number"
              value={form.pricePerLiter}
              onChange={handleChange("pricePerLiter")}
              min="0"
              step="0.0001"
              placeholder="210.00"
            />
          </div>

          {/* Total */}
          <div className="space-y-2">
            <Label htmlFor="totalAmount">Ukupan iznos (RSD)</Label>
            <Input
              id="totalAmount"
              type="number"
              value={form.totalAmount}
              onChange={handleChange("totalAmount")}
              min="0"
              step="0.01"
              placeholder="Automatski"
            />
          </div>

          {/* Fuel type */}
          <div className="space-y-2">
            <Label>Tip goriva</Label>
            <Select value={form.fuelType} onValueChange={set("fuelType")}>
              <SelectTrigger>
                <SelectValue placeholder="Odaberi..." />
              </SelectTrigger>
              <SelectContent>
                {["Dizel", "Benzin", "Plin (LPG)", "CNG", "AdBlue"].map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location">Mesto / pumpa</Label>
            <Input
              id="location"
              value={form.location}
              onChange={handleChange("location")}
              placeholder="NIS Petrol, Beograd"
            />
          </div>

          {/* Notes */}
          <div className="space-y-2 sm:col-span-2 lg:col-span-3">
            <Label htmlFor="notes">Napomena</Label>
            <Input
              id="notes"
              value={form.notes}
              onChange={handleChange("notes")}
              placeholder="Dodatne napomene..."
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={loading}>
          {loading ? "Čuvanje..." : mode === "edit" ? "Sačuvaj izmene" : "Dodaj sipanje"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Otkaži
        </Button>
      </div>
    </form>
  );
}
