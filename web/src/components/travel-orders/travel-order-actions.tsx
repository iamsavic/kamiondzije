"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, XCircle, ThumbsUp, Trash2, Loader2 } from "lucide-react";

type Props = {
  orderId: string;
  status: string;
  startOdometer?: number | null;
  canDelete?: boolean;
};

export function TravelOrderActions({ orderId, status, startOdometer, canDelete }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [endOdometer, setEndOdometer] = useState("");

  async function transition(newStatus: string, extra?: Record<string, unknown>) {
    setLoading(newStatus);
    try {
      const res = await fetch(`/api/travel-orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, ...extra }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error ?? "Greška");
        return;
      }
      toast.success(
        newStatus === "approved"
          ? "Nalog odobren."
          : newStatus === "completed"
          ? "Nalog završen."
          : "Nalog otkazan."
      );
      router.refresh();
    } catch {
      toast.error("Mrežna greška.");
    } finally {
      setLoading(null);
    }
  }

  async function deleteOrder() {
    setLoading("delete");
    try {
      const res = await fetch(`/api/travel-orders/${orderId}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error ?? "Greška");
        return;
      }
      toast.success("Nalog obrisan.");
      router.push("/dashboard/travel-orders");
      router.refresh();
    } catch {
      toast.error("Mrežna greška.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Approve */}
      {status === "draft" && (
        <Button
          size="sm"
          variant="outline"
          className="gap-1 text-blue-600 border-blue-200 hover:bg-blue-50"
          disabled={loading !== null}
          onClick={() => transition("approved")}
        >
          {loading === "approved" ? <Loader2 className="size-4 animate-spin" /> : <ThumbsUp className="size-4" />}
          Odobri
        </Button>
      )}

      {/* Complete */}
      {status === "approved" && (
        <AlertDialog>
          <AlertDialogTrigger
            render={(props) => (
              <Button
                {...props}
                size="sm"
                variant="outline"
                className="gap-1 text-green-600 border-green-200 hover:bg-green-50"
                disabled={loading !== null}
              >
                {loading === "completed" ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle className="size-4" />}
                Završi nalog
              </Button>
            )}
          />
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Završi putni nalog</AlertDialogTitle>
              <AlertDialogDescription>
                Unesite završnu kilometražu vozila (opciono) i potvrdite završetak naloga.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-2 py-2">
              <Label htmlFor="endKm">Završna kilometraža (km)</Label>
              <Input
                id="endKm"
                type="number"
                value={endOdometer}
                onChange={(e) => setEndOdometer(e.target.value)}
                placeholder={startOdometer ? String(startOdometer) : "125350"}
                min={startOdometer ?? 0}
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Otkaži</AlertDialogCancel>
              <AlertDialogAction
                onClick={() =>
                  transition("completed", endOdometer ? { endOdometer: Number(endOdometer) } : {})
                }
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                Završi
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Cancel */}
      {["draft", "approved"].includes(status) && (
        <AlertDialog>
          <AlertDialogTrigger
            render={(props) => (
              <Button
                {...props}
                size="sm"
                variant="outline"
                className="gap-1 text-destructive border-destructive/30 hover:bg-destructive/5"
                disabled={loading !== null}
              >
                <XCircle className="size-4" /> Otkaži nalog
              </Button>
            )}
          />
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Otkaži putni nalog?</AlertDialogTitle>
              <AlertDialogDescription>
                Nalog će biti označen kao otkazan. Ova akcija se ne može poništiti.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Nazad</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => transition("cancelled")}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {loading === "cancelled" ? "Otkazivanje..." : "Otkaži nalog"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Delete */}
      {canDelete && !["completed"].includes(status) && (
        <AlertDialog>
          <AlertDialogTrigger
            render={(props) => (
              <Button
                {...props}
                size="sm"
                variant="ghost"
                className="text-muted-foreground hover:text-destructive"
                disabled={loading !== null}
              >
                <Trash2 className="size-4" />
              </Button>
            )}
          />
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Obriši putni nalog?</AlertDialogTitle>
              <AlertDialogDescription>
                Nalog i svi troškovi će biti trajno obrisani.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Otkaži</AlertDialogCancel>
              <AlertDialogAction
                onClick={deleteOrder}
                disabled={loading === "delete"}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {loading === "delete" ? "Brisanje..." : "Obriši"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
