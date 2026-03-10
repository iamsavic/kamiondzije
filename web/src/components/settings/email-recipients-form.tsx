"use client";

import { useState, useTransition, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, Plus, X, Mail } from "lucide-react";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function EmailRecipientsForm({ initialEmails }: { initialEmails: string[] }) {
  const [emails, setEmails] = useState<string[]>(initialEmails);
  const [inputValue, setInputValue] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function addEmail() {
    const value = inputValue.trim().toLowerCase();
    if (!value) return;

    if (!EMAIL_REGEX.test(value)) {
      setInputError("Neispravna email adresa");
      return;
    }
    if (emails.includes(value)) {
      setInputError("Ova adresa je već dodata");
      return;
    }

    setEmails((prev) => [...prev, value]);
    setInputValue("");
    setInputError(null);
    inputRef.current?.focus();
  }

  function removeEmail(email: string) {
    setEmails((prev) => prev.filter((e) => e !== email));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      addEmail();
    }
    if (e.key === "Escape") {
      setInputValue("");
      setInputError(null);
    }
  }

  function handleSave() {
    startTransition(async () => {
      const res = await fetch("/api/settings/email-recipients", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "Greška pri čuvanju email adresa");
        return;
      }

      toast.success("Lista primalaca je sačuvana");
    });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Dodaj email adresu</Label>
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            type="email"
            placeholder="ime@kompanija.com"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              if (inputError) setInputError(null);
            }}
            onKeyDown={handleKeyDown}
            className={inputError ? "border-destructive" : ""}
          />
          <Button type="button" variant="outline" onClick={addEmail} className="shrink-0 gap-1.5">
            <Plus className="size-4" />
            Dodaj
          </Button>
        </div>
        {inputError && <p className="text-xs text-destructive">{inputError}</p>}
        <p className="text-xs text-muted-foreground">
          Pritisni Enter ili klikni Dodaj. Možeš dodati više adresa.
        </p>
      </div>

      {/* Email chips */}
      <div className="min-h-[60px] rounded-lg border bg-muted/30 p-3">
        {emails.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-3 text-sm text-muted-foreground">
            <Mail className="size-4" />
            <span>Nema podešenih email adresa — dodaj barem jednu</span>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {emails.map((email) => (
              <span
                key={email}
                className="inline-flex items-center gap-1.5 rounded-full border bg-background px-3 py-1 text-sm"
              >
                <Mail className="size-3 text-muted-foreground" />
                {email}
                <button
                  type="button"
                  onClick={() => removeEmail(email)}
                  className="ml-0.5 rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label={`Ukloni ${email}`}
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border bg-muted/30 p-4">
        <p className="text-sm text-muted-foreground">
          {emails.length === 0
            ? "Bez podešenih adresa — obaveštenja idu admin korisnicima"
            : `${emails.length} ${emails.length === 1 ? "adresa" : emails.length < 5 ? "adrese" : "adresa"} podešeno`}
        </p>
        <Button onClick={handleSave} disabled={isPending} className="gap-2">
          <Save className="size-4" />
          {isPending ? "Čuvanje..." : "Sačuvaj"}
        </Button>
      </div>
    </div>
  );
}
