import { CoverageBar } from "@/components/coverage-bar";
import { formatUsd, pct1 } from "@/lib/format";

/** A coverage-bar card: title + right-aligned "x% covered", a thin bar, then a
 *  row of muted stats. Used for the per-region scorecard cards. */
export function CoverageCard({
  title,
  covered,
  deals,
  gap,
  acv,
  gapAcv,
  pctAnyAse,
  deEmphasize = false,
}: {
  title: string;
  covered: number;
  deals: number;
  gap: number;
  acv: number;
  gapAcv: number;
  pctAnyAse: number;
  deEmphasize?: boolean;
}) {
  return (
    <div
      className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3"
      style={deEmphasize ? { opacity: 0.6 } : undefined}
    >
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-semibold tracking-tight">{title}</span>
        <span className="text-xs text-muted-foreground">
          {pct1(pctAnyAse)} covered
        </span>
      </div>
      <CoverageBar covered={covered} total={deals} />
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>{deals} Cap1 deals</span>
        <span>{covered} covered</span>
        <span>{gap} gap</span>
        <span>{formatUsd(acv)} ACV</span>
        <span>{formatUsd(gapAcv)} gap ACV</span>
      </div>
    </div>
  );
}
