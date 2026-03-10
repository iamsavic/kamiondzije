"use client";

import { Badge } from "@/components/ui/badge";
import { VEHICLE_STATUS_LABELS } from "@/lib/doc-status";

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  active: "secondary",
  inactive: "outline",
  in_service: "default",
  sold: "outline",
};

const statusColor: Record<string, string> = {
  active: "bg-green-100 text-green-800 border-green-200 hover:bg-green-100",
  inactive: "text-muted-foreground",
  in_service: "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100",
  sold: "text-muted-foreground line-through",
};

export function VehicleStatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant={statusVariant[status] ?? "outline"}
      className={statusColor[status] ?? ""}
    >
      {VEHICLE_STATUS_LABELS[status] ?? status}
    </Badge>
  );
}
