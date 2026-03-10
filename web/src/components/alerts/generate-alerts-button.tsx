"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function GenerateAlertsButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function generate() {
    setLoading(true);
    try {
      const res = await fetch("/api/alerts/generate", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Greška");
      const parts = [];
      if (data.scope === "org") {
        const total = (data.vehicle_docs ?? 0) + (data.driver_docs ?? 0) + (data.services ?? 0);
        parts.push(`${total} alarm(a) ažurirano`);
        if (data.emails_sent > 0) parts.push(`${data.emails_sent} email(a) poslato`);
      }
      toast.success(parts.length ? parts.join(" · ") : "Alarmi uspešno generisani");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Greška pri generisanju");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant="outline" onClick={generate} disabled={loading} className="gap-2">
      {loading ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <RefreshCw className="size-4" />
      )}
      Generiši alarme
    </Button>
  );
}
