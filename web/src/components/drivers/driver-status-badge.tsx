"use client";

import { Badge } from "@/components/ui/badge";
import { EMPLOYMENT_STATUS_LABELS } from "@/lib/driver-status";

const statusColor: Record<string, string> = {
  active: "bg-green-100 text-green-800 border-green-200 hover:bg-green-100",
  inactive: "text-muted-foreground",
  terminated: "bg-red-100 text-red-800 border-red-200 hover:bg-red-100",
};

export function DriverStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={statusColor[status] ?? ""}>
      {EMPLOYMENT_STATUS_LABELS[status] ?? status}
    </Badge>
  );
}
