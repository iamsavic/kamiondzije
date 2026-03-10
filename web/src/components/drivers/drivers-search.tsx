"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { useCallback, useTransition } from "react";
import { Search } from "lucide-react";

export function DriversSearch({ defaultValue }: { defaultValue?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const handleSearch = useCallback(
    (term: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (term) {
        params.set("search", term);
      } else {
        params.delete("search");
      }
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`);
      });
    },
    [router, pathname, searchParams]
  );

  return (
    <div className="relative">
      <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
      <Input
        placeholder="Pretraži vozače..."
        defaultValue={defaultValue}
        onChange={(e) => handleSearch(e.target.value)}
        className="pl-9 w-64"
      />
    </div>
  );
}
