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
import { Trash2 } from "lucide-react";

export function DeleteFuelButton({ entryId }: { entryId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onDelete() {
    setLoading(true);
    try {
      const res = await fetch(`/api/fuel/${entryId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Greška");
      toast.success("Unos obrisan.");
      router.push("/dashboard/fuel");
      router.refresh();
    } catch {
      toast.error("Nije moguće obrisati unos.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={(props) => (
          <Button {...props} variant="outline" size="sm" className="text-destructive hover:text-destructive">
            <Trash2 className="size-4" />
          </Button>
        )}
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Obriši unos sipanja?</AlertDialogTitle>
          <AlertDialogDescription>
            Ova akcija je nepovratna. Unos će biti trajno obrisan.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Otkaži</AlertDialogCancel>
          <AlertDialogAction
            onClick={onDelete}
            disabled={loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? "Brisanje..." : "Obriši"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
