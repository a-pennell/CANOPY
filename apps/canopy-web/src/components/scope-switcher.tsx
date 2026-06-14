"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { CanopyWebScopeOption } from "../lib/canopy-data";

export function ScopeSwitcher({
  options
}: {
  readonly options: readonly CanopyWebScopeOption[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <div className="scopeButtons" aria-label="Scope switcher">
      {options.map((option) => (
        <button
          className={option.active ? "scopeButton active" : "scopeButton"}
          key={option.id}
          onClick={() => {
            const next = new URLSearchParams(searchParams.toString());
            next.set("scope", option.id);
            router.push(`${pathname}?${next.toString()}`);
          }}
          type="button"
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
