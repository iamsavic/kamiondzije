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

type Vehicle = { id: string; registrationNumber: string; make: string; model: string };

type ServiceFormData = {
  vehicleId: string;
  type: string;
  sentAt: string;
  completedAt: string;
  description: string;
  workshop: string;
  invoiceAmount: string;
  invoiceNumber: string;
  nextServiceKm: string;
  nextServiceDate: string;
  notes: string;
};

type Props = {
  vehicles: Vehicle[];
  service?: Partial<ServiceFormData> & { id?: string };
  defaultVehicleId?: string;
  mode?: "create" | "edit";
};

const empty: ServiceFormData = {
  vehicleId: "",
  type: "routine",
  sentAt: "",
  completedAt: "",
  description: "",
  workshop: "",
  invoiceAmount: "",
  invoiceNumber: "",
  nextServiceKm: "",
  nextServiceDate: "",
  notes: "",
};

function toDate(v: string | Date | null | undefined): string {
  if (!v) return "";
  const d = typeof v === "string" ? new Date(v) : v;
  return d.toISOString().split("T")[0];
}

export function ServiceForm({ vehicles, service, defaultVehicleId, mode = "create" }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<ServiceFormData>({
    ...empty,
    vehicleId: defaultVehicleId ?? "",
    ...service,
    sentAt: toDate(service?.sentAt),
    completedAt: toDate(service?.completedAt),
    nextServiceDate: toDate(service?.nextServiceDate),
  });

  const set = (key: keyof ServiceFormData) => (val: string | null) =>
    setForm((f) => ({ ...f, [key]: val ?? "" }));

  const handleChange =
    (key: keyof ServiceFormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.vehicleId) {
      toast.error("Odaberi vozilo.");
      return;
    }
    setLoading(true);
    try {
      const url =
        mode === "edit" && service?.id
          ? `/api/services/${service.id}`
          : "/api/services";
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
      toast.success(mode === "edit" ? "Servis ažuriran." : "Servis kreiran.");
      router.push(`/dashboard/services/${saved.id}`);
      router.refresh();
    } catch {
      toast.error("Mrežna greška.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Osnovno */}
      <Card>
        <CardHeader>
          <CardTitle>Podaci o servisu</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2 sm:col-span-2 lg:col-span-1">
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

          <div className="space-y-2">
            <Label>Tip servisa *</Label>
            <Select value={form.type} onValueChange={set("type")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="routine">Redovan</SelectItem>
                <SelectItem value="repair">Vanredan / kvar</SelectItem>
                <SelectItem value="preventive">Preventivni</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sentAt">Datum upućivanja</Label>
            <Input id="sentAt" type="date" value={form.sentAt} onChange={handleChange("sentAt")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="completedAt">Datum završetka</Label>
            <Input id="completedAt" type="date" value={form.completedAt} onChange={handleChange("completedAt")} />
          </div>

          <div className="space-y-2 sm:col-span-2 lg:col-span-3">
            <Label htmlFor="description">Opis radova</Label>
            <textarea
              id="description"
              value={form.description}
              onChange={handleChange("description")}
              rows={3}
              placeholder="Zamena ulja i filtera, provera kočionog sistema..."
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="workshop">Servis / radionica</Label>
            <Input id="workshop" value={form.workshop} onChange={handleChange("workshop")} placeholder="Auto servis Petrović" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="invoiceAmount">Iznos računa (RSD)</Label>
            <Input id="invoiceAmount" type="number" value={form.invoiceAmount} onChange={handleChange("invoiceAmount")} step="0.01" min="0" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="invoiceNumber">Broj računa</Label>
            <Input id="invoiceNumber" value={form.invoiceNumber} onChange={handleChange("invoiceNumber")} placeholder="2024-0123" />
          </div>
        </CardContent>
      </Card>

      {/* Sledeći servis */}
      <Card>
        <CardHeader>
          <CardTitle>Sledeći servis</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="nextServiceDate">Preporučeni datum</Label>
            <Input
              id="nextServiceDate"
              type="date"
              value={form.nextServiceDate}
              onChange={handleChange("nextServiceDate")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nextServiceKm">Preporučena kilometraža (km)</Label>
            <Input
              id="nextServiceKm"
              type="number"
              value={form.nextServiceKm}
              onChange={handleChange("nextServiceKm")}
              min="0"
              step="1000"
              placeholder="250000"
            />
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
              rows={2}
              placeholder="Dodatne napomene..."
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={loading}>
          {loading ? "Čuvanje..." : mode === "edit" ? "Sačuvaj izmene" : "Dodaj servisni zapis"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Otkaži
        </Button>
      </div>
    </form>
  );
}
