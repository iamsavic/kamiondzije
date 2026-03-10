"use client";

import { Badge } from "@/components/ui/badge";
import { getDocStatus, daysUntil, DOC_STATUS_LABELS } from "@/lib/doc-status";

const statusColor: Record<string, string> = {
  ok: "bg-green-100 text-green-800 border-green-200 hover:bg-green-100",
  warning: "bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-100",
  critical: "bg-red-100 text-red-800 border-red-200 hover:bg-red-100",
  expired: "bg-red-900 text-red-100 border-red-800 hover:bg-red-900",
};

export function DocStatusBadge({ validTo }: { validTo: string | Date | null | undefined }) {
  const date = validTo ? new Date(validTo) : null;
  const status = getDocStatus(date);
  const days = daysUntil(date);

  const label =
    status === "expired"
      ? `Istekao ${Math.abs(days ?? 0)}d`
      : status === "ok"
      ? DOC_STATUS_LABELS.ok
      : `${DOC_STATUS_LABELS[status]} — ${days}d`;

  return (
    <Badge variant="outline" className={statusColor[status]}>
      {label}
    </Badge>
  );
}
