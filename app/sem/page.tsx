"use client";

import { PageShell } from "@/components/page-shell";
import { RollupTable } from "@/components/rollup-table";
import { MethodologyNote } from "@/components/methodology-note";
import { useCoverage } from "@/components/coverage-provider";
import { bySeManager } from "@/lib/aggregate";

export default function SemRollupPage() {
  const { quarterDeals } = useCoverage();
  const rows = bySeManager(quarterDeals);

  return (
    <PageShell
      title="SEM Rollup"
      description="ASE coverage by SE Manager (deduped to one manager per account), ranked by coverage. Accounts with no SE assignment fall into a (No SE manager) bucket. Drill into a manager's uncovered Cap1s. Scoped to your region and quarter filters."
      showQuarterFilter
    >
      <div className="flex flex-col gap-4">
        <RollupTable
          dimensionLabel="SE Manager"
          rows={rows}
          hrefFor={(r) => `/uncovered?sem=${encodeURIComponent(r.key)}`}
        />
        <MethodologyNote />
      </div>
    </PageShell>
  );
}
