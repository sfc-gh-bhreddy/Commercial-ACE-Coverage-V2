"use client";

import { PageShell } from "@/components/page-shell";
import { RollupTable } from "@/components/rollup-table";
import { MethodologyNote } from "@/components/methodology-note";
import { useCoverage } from "@/components/coverage-provider";
import { byLeadSe } from "@/lib/aggregate";

export default function SeRollupPage() {
  const { quarterDeals } = useCoverage();
  const rows = byLeadSe(quarterDeals);

  return (
    <PageShell
      title="SE Rollup"
      description="ASE coverage by Lead SE (from D_SALESFORCE_ACCOUNT_CUSTOMERS), ranked by coverage. Drill into an SE's uncovered Cap1s. Scoped to your region and quarter filters."
      showQuarterFilter
    >
      <div className="flex flex-col gap-4">
        <RollupTable
          dimensionLabel="Lead SE"
          rows={rows}
          hrefFor={(r) => `/uncovered?se=${encodeURIComponent(r.key)}`}
        />
        <MethodologyNote />
      </div>
    </PageShell>
  );
}
