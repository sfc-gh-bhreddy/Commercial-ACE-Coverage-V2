"use client";

import { FilterChip } from "@/components/filter-chip";
import { useCoverage } from "@/components/coverage-provider";

/**
 * Global fiscal-quarter filter. Selection lives in CoverageProvider so it
 * persists as the user moves between the Uncovered list and the rollups.
 * Options are derived from the loaded data (Q1..Q4 present).
 */
export function QuarterFilterControl() {
  const { deals, quarter, setQuarter } = useCoverage();

  const opts = Array.from(
    new Map(deals.map((d) => [d.fqNum, d.fiscalQuarter])).entries(),
  ).sort((a, b) => a[0] - b[0]);

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">Quarter:</span>
      <FilterChip active={quarter === "ALL"} onClick={() => setQuarter("ALL")}>
        All
      </FilterChip>
      {opts.map(([fq, label]) => (
        <FilterChip
          key={fq}
          active={quarter === fq}
          onClick={() => setQuarter(fq)}
        >
          {label}
        </FilterChip>
      ))}
    </div>
  );
}
