"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Save, AlertTriangle, AlertCircle, Clock } from "lucide-react";
import { ALERT_RULE_TYPES } from "@/lib/alert-rule-types";

type AlertRule = {
  id: string;
  type: string;
  name: string;
  warningDays: number;
  criticalDays: number;
  isActive: boolean;
};

type RuleState = {
  id: string;
  warningDays: number;
  criticalDays: number;
  isActive: boolean;
};

function getRuleMeta(type: string) {
  return ALERT_RULE_TYPES.find((r) => r.type === type);
}

export function NotificationRulesForm({ rules }: { rules: AlertRule[] }) {
  const [ruleStates, setRuleStates] = useState<RuleState[]>(
    rules.map((r) => ({
      id: r.id,
      warningDays: r.warningDays,
      criticalDays: r.criticalDays,
      isActive: r.isActive,
    }))
  );
  const [isPending, startTransition] = useTransition();

  function updateRule(id: string, field: keyof Omit<RuleState, "id">, value: number | boolean) {
    setRuleStates((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  }

  function handleSave() {
    startTransition(async () => {
      const res = await fetch("/api/settings/notification-rules", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ruleStates),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "Greška pri čuvanju podešavanja");
        return;
      }

      toast.success("Podešavanja notifikacija su sačuvana");
    });
  }

  const mergedRules = rules.map((rule) => {
    const state = ruleStates.find((s) => s.id === rule.id);
    const meta = getRuleMeta(rule.type);
    return { ...rule, ...(state ?? {}), meta };
  });

  return (
    <div className="space-y-6">
      <div className="grid gap-4">
        {mergedRules.map((rule) => {
          const state = ruleStates.find((s) => s.id === rule.id)!;
          const warningError =
            state.warningDays < 1 ? "Mora biti veće od 0" : null;
          const criticalError =
            state.criticalDays < 1
              ? "Mora biti veće od 0"
              : state.criticalDays >= state.warningDays
              ? "Mora biti manje od narandžastog praga"
              : null;

          return (
            <Card
              key={rule.id}
              className={!state.isActive ? "opacity-60" : undefined}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <CardTitle className="text-base">{rule.name}</CardTitle>
                    {rule.meta?.description && (
                      <CardDescription>{rule.meta.description}</CardDescription>
                    )}
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={state.isActive}
                    onClick={() => updateRule(rule.id, "isActive", !state.isActive)}
                    className={[
                      "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      state.isActive ? "bg-primary" : "bg-muted",
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "pointer-events-none inline-block h-5 w-5 rounded-full bg-background shadow-lg transition-transform duration-200",
                        state.isActive ? "translate-x-5" : "translate-x-0",
                      ].join(" ")}
                    />
                  </button>
                </div>
              </CardHeader>

              <CardContent>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  {/* Warning threshold */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5 text-sm font-medium">
                      <AlertTriangle className="size-3.5 text-orange-500" />
                      Narandžasto upozorenje
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={1}
                        max={365}
                        value={state.warningDays}
                        onChange={(e) =>
                          updateRule(rule.id, "warningDays", parseInt(e.target.value) || 1)
                        }
                        disabled={!state.isActive}
                        className={`w-24 ${warningError ? "border-destructive" : ""}`}
                      />
                      <span className="text-sm text-muted-foreground">dana pre isteka</span>
                    </div>
                    {warningError && (
                      <p className="text-xs text-destructive">{warningError}</p>
                    )}
                    <Badge
                      variant="outline"
                      className="border-orange-300 bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300"
                    >
                      <AlertTriangle className="mr-1 size-3" />
                      {state.warningDays}d
                    </Badge>
                  </div>

                  {/* Critical threshold */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5 text-sm font-medium">
                      <AlertCircle className="size-3.5 text-red-500" />
                      Crveno upozorenje
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={1}
                        max={365}
                        value={state.criticalDays}
                        onChange={(e) =>
                          updateRule(rule.id, "criticalDays", parseInt(e.target.value) || 1)
                        }
                        disabled={!state.isActive}
                        className={`w-24 ${criticalError ? "border-destructive" : ""}`}
                      />
                      <span className="text-sm text-muted-foreground">dana pre isteka</span>
                    </div>
                    {criticalError && (
                      <p className="text-xs text-destructive">{criticalError}</p>
                    )}
                    <Badge
                      variant="outline"
                      className="border-red-300 bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"
                    >
                      <AlertCircle className="mr-1 size-3" />
                      {state.criticalDays}d
                    </Badge>
                  </div>
                </div>

                {/* Visual timeline */}
                {state.isActive && (
                  <div className="mt-4 space-y-1.5">
                    <p className="text-xs text-muted-foreground">Pregled pragova:</p>
                    <div className="flex items-center gap-1 text-xs">
                      <span className="flex-1 rounded bg-green-100 px-2 py-1 text-center font-medium text-green-700 dark:bg-green-950 dark:text-green-300">
                        Važeći
                      </span>
                      <span className="text-muted-foreground">→</span>
                      <span className="flex-none rounded bg-orange-100 px-2 py-1 text-center font-medium text-orange-700 dark:bg-orange-950 dark:text-orange-300">
                        {state.criticalDays + 1}–{state.warningDays}d
                      </span>
                      <span className="text-muted-foreground">→</span>
                      <span className="flex-none rounded bg-red-100 px-2 py-1 text-center font-medium text-red-700 dark:bg-red-950 dark:text-red-300">
                        1–{state.criticalDays}d
                      </span>
                      <span className="text-muted-foreground">→</span>
                      <span className="flex-none rounded bg-red-950 px-2 py-1 text-center font-medium text-red-200">
                        Isteklo
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border bg-muted/30 p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="size-4" />
          <span>
            Promene stupaju na snagu pri sledećem generisanju alarma
          </span>
        </div>
        <Button onClick={handleSave} disabled={isPending} className="gap-2 shrink-0">
          <Save className="size-4" />
          {isPending ? "Čuvanje..." : "Sačuvaj podešavanja"}
        </Button>
      </div>
    </div>
  );
}
