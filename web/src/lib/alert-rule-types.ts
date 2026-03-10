export const ALERT_RULE_TYPES = [
  {
    type: "vehicle_doc_expiry",
    name: "Dokumenta vozila",
    description: "Registracija, osiguranje, zeleni karton, žuti karton, atest za plin",
    defaultWarningDays: 30,
    defaultCriticalDays: 5,
  },
  {
    type: "driver_license_expiry",
    name: "Vozačka dozvola",
    description: "Istek vozačke dozvole aktivnih vozača",
    defaultWarningDays: 30,
    defaultCriticalDays: 5,
  },
  {
    type: "driver_idcard_expiry",
    name: "Lična karta vozača",
    description: "Istek lične karte aktivnih vozača",
    defaultWarningDays: 30,
    defaultCriticalDays: 5,
  },
  {
    type: "service_due_date",
    name: "Servis po datumu",
    description: "Preporučeni datum sledećeg servisa vozila",
    defaultWarningDays: 30,
    defaultCriticalDays: 7,
  },
] as const;

export type AlertRuleType = (typeof ALERT_RULE_TYPES)[number]["type"];
