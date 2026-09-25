"use client";

import { cn } from "@/lib/utils";

export function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "text-xs px-3 py-1.5 rounded-full border transition-colors",
        active
          ? "border-transparent"
          : "border-border bg-transparent text-muted-foreground hover:text-foreground hover:border-foreground/30",
      )}
      style={
        active
          ? {
              backgroundColor: "var(--brand-primary)",
              color: "var(--brand-primary-foreground)",
              borderColor: "var(--brand-primary)",
            }
          : undefined
      }
    >
      {children}
    </button>
  );
}
