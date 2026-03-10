"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import { DOC_TYPE_LABELS } from "@/lib/doc-status";

export function AddDocumentDialog({ vehicleId }: { vehicleId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    type: "registration",
    documentNumber: "",
    validFrom: "",
    validTo: "",
    notes: "",
  });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/vehicles/${vehicleId}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        toast.error("Greška pri dodavanju dokumenta");
        return;
      }
      toast.success("Dokument dodat.");
      setOpen(false);
      setForm({ type: "registration", documentNumber: "", validFrom: "", validTo: "", notes: "" });
      router.refresh();
    } catch {
      toast.error("Mrežna greška.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={(props) => (
          <Button {...props} size="sm" variant="outline">
            <Plus className="size-4" /> Dodaj dokument
          </Button>
        )}
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novi dokument</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Tip dokumenta</Label>
            <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v ?? f.type }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(DOC_TYPE_LABELS).map(([val, label]) => (
                  <SelectItem key={val} value={val}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="docNumber">Broj dokumenta</Label>
            <Input
              id="docNumber"
              value={form.documentNumber}
              onChange={(e) => setForm((f) => ({ ...f, documentNumber: e.target.value }))}
              placeholder="npr. POL-2025-001"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="validFrom">Važi od</Label>
              <Input
                id="validFrom"
                type="date"
                value={form.validFrom}
                onChange={(e) => setForm((f) => ({ ...f, validFrom: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="validTo">Važi do *</Label>
              <Input
                id="validTo"
                type="date"
                value={form.validTo}
                onChange={(e) => setForm((f) => ({ ...f, validTo: e.target.value }))}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Napomena</Label>
            <Input
              id="notes"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Otkaži
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Čuvanje..." : "Sačuvaj"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
