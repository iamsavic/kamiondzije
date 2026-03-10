"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CheckCircle, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function AlertsActionButtons({ alertId }: { alertId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<"resolved" | "ignored" | null>(null);

  async function updateAlert(status: "resolved" | "ignored") {
    setLoading(status);
    try {
      const res = await fetch(`/api/alerts/${alertId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Greška");
      toast.success(status === "resolved" ? "Alarm rešen" : "Alarm ignorisan");
      router.refresh();
    } catch {
      toast.error("Nije moguće ažurirati alarm");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        size="sm"
        variant="outline"
        className="h-7 text-xs gap-1"
        disabled={loading !== null}
        onClick={() => updateAlert("resolved")}
      >
        {loading === "resolved" ? (
          <Loader2 className="size-3 animate-spin" />
        ) : (
          <CheckCircle className="size-3 text-green-600" />
        )}
        Rešeno
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="h-7 text-xs gap-1 text-muted-foreground"
        disabled={loading !== null}
        onClick={() => updateAlert("ignored")}
      >
        {loading === "ignored" ? (
          <Loader2 className="size-3 animate-spin" />
        ) : (
          <EyeOff className="size-3" />
        )}
        Ignoriši
      </Button>
    </div>
  );
}
