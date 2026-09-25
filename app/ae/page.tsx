"use client";

import { PageShell } from "@/components/page-shell";
import { RollupTable } from "@/components/rollup-table";
import { MethodologyNote } from "@/components/methodology-note";
import { useCoverage } from "@/components/coverage-provider";
import { byOwner } from "@/lib/aggregate";

export default function AeRollupPage() {
  const { quarterDeals } = useCoverage();
  const rows = byOwner(quarterDeals);

  return (
    <PageShell
      title="AE Rollup"
      description="ASE coverage by AE (opportunity owner), ranked by coverage. Drill into an AE's uncovered Cap1s. Scoped to your region and quarter filters."
      showQuarterFilter
    >
      <div className="flex flex-col gap-4">
        <RollupTable
          dimensionLabel="AE"
          rows={rows}
          hrefFor={(r) => `/uncovered?owner=${encodeURIComponent(r.key)}`}
        />
        <MethodologyNote />
      </div>
    </PageShell>
  );
}
