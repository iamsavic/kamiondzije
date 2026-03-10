import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type AlertLevel = "warning" | "critical" | "expired";

const levelConfig: Record<
  AlertLevel,
  { label: string; className: string }
> = {
  warning: {
    label: "Upozorenje",
    className: "bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-100",
  },
  critical: {
    label: "Kritično",
    className: "bg-red-100 text-red-800 border-red-200 hover:bg-red-100",
  },
  expired: {
    label: "Isteklo",
    className: "bg-red-900 text-red-100 border-red-800 hover:bg-red-900",
  },
};

export function AlertLevelBadge({
  level,
  className,
}: {
  level: string;
  className?: string;
}) {
  const config = levelConfig[level as AlertLevel] ?? {
    label: level,
    className: "bg-gray-100 text-gray-800",
  };

  return (
    <Badge variant="outline" className={cn(config.className, className)}>
      {config.label}
    </Badge>
  );
}

export const ALERT_TYPE_LABELS: Record<string, string> = {
  vehicle_doc_expiry: "Dokument vozila",
  driver_license_expiry: "Vozačka dozvola",
  driver_idcard_expiry: "Lična karta",
  service_due_date: "Servis po datumu",
  service_due_km: "Servis po km",
};
