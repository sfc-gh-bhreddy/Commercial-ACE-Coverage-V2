"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Download } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { DealsTable } from "@/components/deals-table";
import { useCoverage } from "@/components/coverage-provider";
import { summarize } from "@/lib/aggregate";
import { exportCsv } from "@/lib/csv";
import { formatUsd } from "@/lib/format";
import { regionLabel } from "@/lib/constants";
import type { Deal } from "@/lib/types";

function UncoveredInner() {
  const { quarterDeals } = useCoverage();
  const params = useSearchParams();

  const drillRegion = params.get("region");
  const drillDistrict = params.get("district");
  const drillSem = params.get("sem");
  const drillSe = params.get("se");
  const drillOwner = params.get("owner");
  const drillAse = params.get("ace");

  let deals = quarterDeals;

  let drillLabel: string | null = null;
  if (drillRegion) {
    deals = deals.filter((d) => d.region === drillRegion);
    drillLabel = `Region: ${regionLabel(drillRegion)}`;
  } else if (drillDistrict) {
    deals = deals.filter((d) => (d.district ?? "(No district)") === drillDistrict);
    drillLabel = `District: ${drillDistrict}`;
  } else if (drillSem) {
    deals = deals.filter((d) => (d.seManager ?? "(No SE manager)") === drillSem);
    drillLabel = `SE Manager: ${drillSem}`;
  } else if (drillSe) {
    deals = deals.filter((d) => (d.leadSe ?? "(No SE)") === drillSe);
    drillLabel = `SE: ${drillSe}`;
  } else if (drillOwner) {
    deals = deals.filter((d) => (d.owner ?? "(No owner)") === drillOwner);
    drillLabel = `AE: ${drillOwner}`;
  } else if (drillAse) {
    deals = deals.filter((d) => d.assignedAse === drillAse);
    drillLabel = `ASE: ${drillAse}`;
  }

  // Default sort: No ASE first, then by close date
  const sorted: Deal[] = [...deals].sort((a, b) => {
    const aStatus = a.hasAnyAse ? 1 : 0;
    const bStatus = b.hasAnyAse ? 1 : 0;
    if (aStatus !== bStatus) return aStatus - bStatus;
    const ax = a.closeDate ?? "";
    const bx = b.closeDate ?? "";
    if (!ax && !bx) return 0;
    if (!ax) return 1;
    if (!bx) return -1;
    return bx.localeCompare(ax);
  });
  // When no drill filter is active, show only uncovered accounts by default.
  const filtered = drillLabel ? sorted : sorted.filter((d) => !d.hasAnyAse);
  const s = summarize(filtered);

  return (
    <>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {drillLabel ? (
              <>
                <span
                  className="rounded-full border px-2.5 py-0.5 text-xs font-medium"
                  style={{
                    borderColor: "var(--brand-primary)",
                    color: "var(--brand-primary)",
                  }}
                >
                  {drillLabel}
                </span>
                <Link
                  href="/uncovered"
                  className="text-xs hover:underline"
                  style={{ color: "var(--brand-primary)" }}
                >
                  Clear
                </Link>
              </>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => exportCsv(filtered, "uncovered-cap1s.csv")}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
          >
            <Download className="size-3.5" />
            Export CSV
          </button>
        </div>

        <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
          <span>
            <strong className="text-foreground">{s.deals}</strong> Cap1 deals
          </span>
          <span>
            <strong className="text-foreground">{formatUsd(s.acv)}</strong> Cap1 ACV
          </span>
          <span>median deal {formatUsd(s.gapAcvMedian || medianAcv(sorted))}</span>
        </div>

        <DealsTable
          deals={filtered}
          showColumns={{ district: true, seManager: true, owner: true, suggestedPlay: true }}
        />
        <p className="text-xs text-muted-foreground">
          Sorted by status (No ASE first), then by close date. Use column headers to re-sort or filter.
        </p>
      </div>
    </>
  );
}

function medianAcv(deals: Deal[]): number {
  if (deals.length === 0) return 0;
  const v = deals.map((d) => d.cap1Acv).sort((a, b) => a - b);
  const mid = Math.floor(v.length / 2);
  return v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2;
}

export default function UncoveredPage() {
  return (
    <PageShell
      title="ASE Coverage"
      description="Cap1 deals sorted by coverage status and close date. Use column filters to drill down."
      showQuarterFilter
    >
      <Suspense
        fallback={
          <div className="text-sm text-muted-foreground">Loading list...</div>
        }
      >
        <UncoveredInner />
      </Suspense>
    </PageShell>
  );
}
