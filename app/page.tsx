"use client";

import { PageShell } from "@/components/page-shell";
import { KpiCard } from "@/components/kpi-card";
import { CoverageCard } from "@/components/coverage-card";
import { TrendMatrix } from "@/components/trend-matrix";
import { MethodologyNote, Callout } from "@/components/methodology-note";
import { useCoverage } from "@/components/coverage-provider";
import { summarize, byRegion } from "@/lib/aggregate";
import { formatUsd, pct1 } from "@/lib/format";
import { regionLabel, APP_DESCRIPTION } from "@/lib/constants";

export default function OverviewPage() {
  const { visibleDeals } = useCoverage();
  const s = summarize(visibleDeals);
  const regions = byRegion(visibleDeals, regionLabel);

  // Whale concentration: is a single gap deal most of the gap ACV?
  const gapDeals = visibleDeals
    .filter((d) => !d.hasAnyAse)
    .sort((a, b) => b.cap1Acv - a.cap1Acv);
  const topGap = gapDeals[0];
  const topGapShare =
    topGap && s.gapAcv > 0 ? (topGap.cap1Acv / s.gapAcv) * 100 : 0;

  const medianGap = medianOf(gapDeals.map((d) => d.cap1Acv));

  return (
    <PageShell
      title="Overview"
      description={APP_DESCRIPTION}
      showQuarterFilter
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard label="Cap1 deals (FY27)" value={s.deals} sub="closed-won Cap1s in scope" />
        <KpiCard
          label="Cap1 ACV"
          value={formatUsd(s.acv)}
          sub={`${formatUsd(s.gapAcv)} sits in uncovered deals`}
        />
        <KpiCard
          label="ASE coverage"
          value={pct1(s.pctAnyAse)}
          sub={`${s.covered} of ${s.deals} deals with an ASE attached`}
          accent
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        {regions.map((r) => (
          <CoverageCard
            key={r.key}
            title={r.label}
            covered={r.covered}
            deals={r.deals}
            gap={r.gap}
            acv={r.acv}
            gapAcv={r.gapAcv}
            pctAnyAse={r.pctAnyAse}
            deEmphasize={r.allOpenQuarter}
          />
        ))}
      </div>

      <div className="mt-8">
        <h2 className="text-sm font-semibold text-muted-foreground mb-3">
          Coverage by fiscal quarter (FY27)
        </h2>
        <TrendMatrix deals={visibleDeals} />
      </div>

      <div className="mt-4 flex flex-col gap-4">
        {topGapShare >= 50 ? (
          <Callout title="Gap ACV is whale-skewed">
            {topGap?.accountName ?? "One deal"} (
            {formatUsd(topGap?.cap1Acv ?? 0)}) alone is {pct1(topGapShare)} of the{" "}
            {formatUsd(s.gapAcv)} in uncovered Cap1 ACV. Typical (median) gap deal
            is {formatUsd(medianGap)} — prioritize by deal on the ASE Coverage
            list, not just by total ACV.
          </Callout>
        ) : null}
        <MethodologyNote />
      </div>
    </PageShell>
  );
}

function medianOf(values: number[]): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}
