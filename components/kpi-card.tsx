import { cn } from "@/lib/utils";

export function KpiCard({
  label,
  value,
  sub,
  accent = false,
  className,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  accent?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-4 flex flex-col gap-3",
        className,
      )}
    >
      <span className="text-xs text-muted-foreground">{label}</span>
      <span
        className="text-3xl font-bold tracking-tight leading-none"
        style={accent ? { color: "var(--brand-primary)" } : undefined}
      >
        {value}
      </span>
      {sub ? (
        <span className="text-xs text-muted-foreground">{sub}</span>
      ) : null}
    </div>
  );
}
