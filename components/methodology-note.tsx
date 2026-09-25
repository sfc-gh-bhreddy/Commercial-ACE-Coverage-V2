import { AlertTriangle } from "lucide-react";

export function Callout({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 flex items-start gap-3">
      <AlertTriangle
        className="size-5 shrink-0"
        style={{ color: "#92400e" }}
      />
      <div className="flex flex-col gap-1">
        <span className="text-sm font-semibold tracking-tight">{title}</span>
        <div className="text-xs text-muted-foreground leading-relaxed">
          {children}
        </div>
      </div>
    </div>
  );
}

/** The standard methodology note shown alongside coverage numbers. */
export function MethodologyNote() {
  return (
    <Callout title="How coverage is measured">
      This indicates the book has below-average ASE coverage — 5 or more Cap1s
      with under 10% of them covered, so not enough ASEs are assigned.
    </Callout>
  );
}
