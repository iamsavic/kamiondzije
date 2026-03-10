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
import { Plus, Trash2 } from "lucide-react";

type Vehicle = { id: string; registrationNumber: string; make: string; model: string };
type Driver = { id: string; firstName: string; lastName: string };

type Expense = { description: string; amount: string; currency: string };

type FormData = {
  driverId: string;
  vehicleId: string;
  route: string;
  purpose: string;
  departureAt: string;
  returnAt: string;
  startOdometer: string;
  endOdometer: string;
  fuelUsed: string;
  notes: string;
  expenses: Expense[];
};

type Props = {
  vehicles: Vehicle[];
  drivers: Driver[];
  order?: Partial<Omit<FormData, "expenses">> & {
    id?: string;
    expenses?: Expense[];
  };
  defaultVehicleId?: string;
  defaultDriverId?: string;
  mode?: "create" | "edit";
};

const empty: FormData = {
  driverId: "",
  vehicleId: "",
  route: "",
  purpose: "",
  departureAt: "",
  returnAt: "",
  startOdometer: "",
  endOdometer: "",
  fuelUsed: "",
  notes: "",
  expenses: [],
};

function toDateTimeLocal(v: string | Date | null | undefined): string {
  if (!v) return "";
  const d = typeof v === "string" ? new Date(v) : v;
  return d.toISOString().slice(0, 16);
}

export function TravelOrderForm({
  vehicles,
  drivers,
  order,
  defaultVehicleId,
  defaultDriverId,
  mode = "create",
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<FormData>({
    ...empty,
    vehicleId: defaultVehicleId ?? "",
    driverId: defaultDriverId ?? "",
    ...order,
    departureAt: toDateTimeLocal(order?.departureAt),
    returnAt: toDateTimeLocal(order?.returnAt),
    expenses: order?.expenses ?? [],
  });

  const set = (key: keyof Omit<FormData, "expenses">) => (val: string | null) =>
    setForm((f) => ({ ...f, [key]: val ?? "" }));

  const handleChange =
    (key: keyof Omit<FormData, "expenses">) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  // Auto-calculate distance
  const distance =
    form.startOdometer && form.endOdometer
      ? Math.max(0, Number(form.endOdometer) - Number(form.startOdometer))
      : null;

  // Expenses
  function addExpense() {
    setForm((f) => ({
      ...f,
      expenses: [...f.expenses, { description: "", amount: "", currency: "RSD" }],
    }));
  }

  function removeExpense(i: number) {
    setForm((f) => ({ ...f, expenses: f.expenses.filter((_, idx) => idx !== i) }));
  }

  function updateExpense(i: number, key: keyof Expense, val: string) {
    setForm((f) => ({
      ...f,
      expenses: f.expenses.map((ex, idx) => (idx === i ? { ...ex, [key]: val } : ex)),
    }));
  }

  const totalExpenses = form.expenses.reduce(
    (s, ex) => s + (parseFloat(ex.amount) || 0),
    0
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.driverId) { toast.error("Odaberi vozača."); return; }
    if (!form.vehicleId) { toast.error("Odaberi vozilo."); return; }

    setLoading(true);
    try {
      const url =
        mode === "edit" && order?.id
          ? `/api/travel-orders/${order.id}`
          : "/api/travel-orders";
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
      toast.success(mode === "edit" ? "Nalog ažuriran." : "Putni nalog kreiran.");
      router.push(`/dashboard/travel-orders/${saved.id}`);
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
          <CardTitle>Osnovno</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label>Vozač *</Label>
            <Select value={form.driverId} onValueChange={set("driverId")}>
              <SelectTrigger>
                <SelectValue placeholder="Odaberi vozača..." />
              </SelectTrigger>
              <SelectContent>
                {drivers.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.firstName} {d.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Vozilo *</Label>
            <Select value={form.vehicleId} onValueChange={set("vehicleId")}>
              <SelectTrigger>
                <SelectValue placeholder="Odaberi vozilo..." />
              </SelectTrigger>
              <SelectContent>
                {vehicles.map((v) => (
                  <SelectItem key={v.id} value={String(v.id)}>
                    {v.registrationNumber} — {v.make} {v.model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 sm:col-span-2 lg:col-span-1">
            <Label htmlFor="route">Relacija</Label>
            <Input
              id="route"
              value={form.route}
              onChange={handleChange("route")}
              placeholder="Beograd — Novi Sad — Beograd"
            />
          </div>

          <div className="space-y-2 sm:col-span-2 lg:col-span-3">
            <Label htmlFor="purpose">Svrha puta</Label>
            <Input
              id="purpose"
              value={form.purpose}
              onChange={handleChange("purpose")}
              placeholder="Dostava robe, servisna intervencija..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="departureAt">Polazak</Label>
            <Input
              id="departureAt"
              type="datetime-local"
              value={form.departureAt}
              onChange={handleChange("departureAt")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="returnAt">Povratak</Label>
            <Input
              id="returnAt"
              type="datetime-local"
              value={form.returnAt}
              onChange={handleChange("returnAt")}
            />
          </div>
        </CardContent>
      </Card>

      {/* Kilometraža */}
      <Card>
        <CardHeader>
          <CardTitle>Kilometraža i gorivo</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="startOdometer">Početna km</Label>
            <Input
              id="startOdometer"
              type="number"
              value={form.startOdometer}
              onChange={handleChange("startOdometer")}
              min="0"
              step="1"
              placeholder="125000"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="endOdometer">Završna km</Label>
            <Input
              id="endOdometer"
              type="number"
              value={form.endOdometer}
              onChange={handleChange("endOdometer")}
              min="0"
              step="1"
              placeholder="125350"
            />
          </div>

          <div className="space-y-2">
            <Label>Pređeno km</Label>
            <div className="flex h-9 items-center rounded-md border border-input bg-muted px-3 text-sm">
              {distance !== null ? (
                <span className="font-medium">{distance.toLocaleString("sr-RS")} km</span>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fuelUsed">Gorivo (L)</Label>
            <Input
              id="fuelUsed"
              type="number"
              value={form.fuelUsed}
              onChange={handleChange("fuelUsed")}
              min="0"
              step="0.01"
              placeholder="45.00"
            />
          </div>
        </CardContent>
      </Card>

      {/* Troškovi */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Troškovi puta</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={addExpense} className="gap-1">
            <Plus className="size-4" /> Dodaj trošak
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {form.expenses.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nema unesenih troškova. Klikni &quot;Dodaj trošak&quot; da dodaš stavku.
            </p>
          ) : (
            <>
              {form.expenses.map((ex, i) => (
                <div key={i} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Input
                    value={ex.description}
                    onChange={(e) => updateExpense(i, "description", e.target.value)}
                    placeholder="Opis troška (putarina, parking...)"
                    className="sm:flex-1"
                  />
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={ex.amount}
                      onChange={(e) => updateExpense(i, "amount", e.target.value)}
                      placeholder="Iznos"
                      className="w-28"
                      min="0"
                      step="0.01"
                    />
                    <Select
                      value={ex.currency}
                      onValueChange={(v) => updateExpense(i, "currency", v ?? "")}
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="RSD">RSD</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeExpense(i)}
                      className="text-destructive hover:text-destructive shrink-0"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {totalExpenses > 0 && (
                <div className="flex justify-end border-t pt-3">
                  <p className="text-sm font-medium">
                    Ukupno: {totalExpenses.toLocaleString("sr-RS", { minimumFractionDigits: 2 })} RSD
                  </p>
                </div>
              )}
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
              rows={2}
              placeholder="Slobodne napomene..."
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={loading}>
          {loading
            ? "Čuvanje..."
            : mode === "edit"
            ? "Sačuvaj izmene"
            : "Kreiraj putni nalog"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Otkaži
        </Button>
      </div>
    </form>
  );
}
