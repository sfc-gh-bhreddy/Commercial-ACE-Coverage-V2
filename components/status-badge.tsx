import { STATUS_PALETTES } from "@/lib/constants";
import type { CoverageStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATUS_TONE: Record<
  CoverageStatus,
  { bg: string; fg: string } | "neutral"
> = {
  Covered: STATUS_PALETTES.success,
  "No ASE": "neutral",
};

const PILL =
  "inline-flex items-center rounded-full text-[11px] font-medium px-2 py-0.5";

export function StatusBadge({
  status,
  className,
}: {
  status: CoverageStatus | string;
  className?: string;
}) {
  const tone = STATUS_TONE[status as CoverageStatus];
  if (!tone || tone === "neutral") {
    return (
      <span
        className={cn(
          PILL,
          "bg-muted text-muted-foreground border border-border",
          className,
        )}
      >
        {status}
      </span>
    );
  }
  return (
    <span
      className={cn(PILL, className)}
      style={{ backgroundColor: tone.bg, color: tone.fg }}
    >
      {status}
    </span>
  );
}

/** Generic yes/no pill (e.g. TMR present). */
export function BoolBadge({
  value,
  yesLabel = "Yes",
  noLabel = "No",
  className,
}: {
  value: boolean;
  yesLabel?: string;
  noLabel?: string;
  className?: string;
}) {
  const tone = value ? STATUS_PALETTES.success : null;
  if (!tone) {
    return (
      <span
        className={cn(
          PILL,
          "bg-muted text-muted-foreground border border-border",
          className,
        )}
      >
        {noLabel}
      </span>
    );
  }
  return (
    <span
      className={cn(PILL, className)}
      style={{ backgroundColor: tone.bg, color: tone.fg }}
    >
      {yesLabel}
    </span>
  );
}
