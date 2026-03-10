// Logika statusa dokumenta (zeleno/narandžasto/crveno/tamnocrveno)
// Pragovi u danima — u budućnosti podesivo iz AlertRule tabele

export const DOC_THRESHOLDS = {
  warning: 30,  // narandžasto
  critical: 5,  // crveno
};

export type DocStatus = "ok" | "warning" | "critical" | "expired";

export function getDocStatus(validTo: Date | null | undefined): DocStatus {
  if (!validTo) return "ok";
  const now = new Date();
  const daysLeft = Math.ceil((validTo.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (daysLeft < 0) return "expired";
  if (daysLeft <= DOC_THRESHOLDS.critical) return "critical";
  if (daysLeft <= DOC_THRESHOLDS.warning) return "warning";
  return "ok";
}

export function daysUntil(validTo: Date | null | undefined): number | null {
  if (!validTo) return null;
  const now = new Date();
  return Math.ceil((validTo.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export const DOC_STATUS_LABELS: Record<DocStatus, string> = {
  ok: "Važeći",
  warning: "Ističe uskoro",
  critical: "Hitno!",
  expired: "Istekao",
};

export const DOC_STATUS_VARIANT: Record<DocStatus, "default" | "secondary" | "destructive" | "outline"> = {
  ok: "secondary",
  warning: "outline",
  critical: "destructive",
  expired: "destructive",
};

export const VEHICLE_STATUS_LABELS: Record<string, string> = {
  active: "Aktivan",
  inactive: "Neaktivan",
  in_service: "U servisu",
  sold: "Prodat",
};

export const DOC_TYPE_LABELS: Record<string, string> = {
  registration: "Registracija",
  insurance: "Osiguranje",
  green_card: "Zeleni karton",
  yellow_card: "Žuti karton",
  lpg_cert: "Atest za plin",
  other: "Ostalo",
};
