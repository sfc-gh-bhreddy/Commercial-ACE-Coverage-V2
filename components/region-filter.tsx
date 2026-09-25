"use client";

import { FilterChip } from "@/components/filter-chip";
import { useCoverage, type RegionFilter } from "@/components/coverage-provider";
import { COMM_EAST, COMM_WEST } from "@/lib/constants";

const OPTIONS: Array<{ value: RegionFilter; label: string }> = [
  { value: "FOCUS", label: "All regions" },
  { value: COMM_EAST, label: "Comm East" },
  { value: COMM_WEST, label: "Comm West" },
];

export function RegionFilterControl() {
  const { region, setRegion } = useCoverage();
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">Region:</span>
      {OPTIONS.map((opt) => (
        <FilterChip
          key={opt.value}
          active={region === opt.value}
          onClick={() => setRegion(opt.value)}
        >
          {opt.label}
        </FilterChip>
      ))}
    </div>
  );
}
