"use client";

import { PageShell } from "@/components/page-shell";
import { RollupTable } from "@/components/rollup-table";
import { MethodologyNote } from "@/components/methodology-note";
import { useCoverage } from "@/components/coverage-provider";
import { byDistrict } from "@/lib/aggregate";

export default function DmRollupPage() {
  const { quarterDeals } = useCoverage();
  const rows = byDistrict(quarterDeals);

  return (
    <PageShell
      title="DM Rollup"
      description="ASE coverage by District (the DM's book), ranked by coverage. Same coverage measures and gap ACV — drill into a district's uncovered Cap1s. Scoped to your region and quarter filters."
      showQuarterFilter
    >
      <div className="flex flex-col gap-4">
        <RollupTable
          dimensionLabel="District"
          rows={rows}
          hrefFor={(r) => `/uncovered?district=${encodeURIComponent(r.key)}`}
        />
        <MethodologyNote />
      </div>
    </PageShell>
  );
}
