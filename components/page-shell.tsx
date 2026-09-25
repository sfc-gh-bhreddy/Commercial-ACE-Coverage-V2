"use client";

import { useCoverage } from "@/components/coverage-provider";
import { RegionFilterControl } from "@/components/region-filter";
import { QuarterFilterControl } from "@/components/quarter-filter";
import { summarize } from "@/lib/aggregate";

function GapBar() {
  const { quarterDeals, quarter } = useCoverage();
  const s = summarize(quarterDeals);
  if (s.deals === 0) return null;
  const pctGap = ((s.gap / s.deals) * 100).toFixed(1);
  const pctCovered = ((s.covered / s.deals) * 100).toFixed(1);
  const scope = quarter === "ALL" ? "FY27" : `Q${quarter}`;
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${pctCovered}%`, backgroundColor: "#2e9bd6" }}
        />
      </div>
      <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
        {scope}: {pctGap}% no ASE ({s.gap} of {s.deals})
      </span>
    </div>
  );
}

export function PageShell({
  title,
  description,
  showRegionFilter = true,
  showQuarterFilter = false,
  topSlot,
  children,
}: {
  title: string;
  description: string;
  showRegionFilter?: boolean;
  showQuarterFilter?: boolean;
  topSlot?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { loading, error, deals, hasMounted } = useCoverage();
  const hasData = deals.length > 0;
  const showSpinner = !hasData && loading && hasMounted;

  return (
    <main className="w-full max-w-[1400px] mx-auto py-8 px-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
          <p className="text-[13px] text-muted-foreground mt-1 max-w-3xl leading-relaxed">
            {description}
          </p>
        </div>
        {showRegionFilter || showQuarterFilter ? (
          <div className="flex flex-col gap-2 md:items-end shrink-0">
            {showRegionFilter ? <RegionFilterControl /> : null}
            {showQuarterFilter ? <QuarterFilterControl /> : null}
          </div>
        ) : null}
      </div>

      {topSlot ? <div className="mt-6">{topSlot}</div> : null}

      {hasData && !error ? (
        <div
          className="mt-5 rounded-lg border px-4 py-3"
          style={{ background: "var(--card)", borderColor: "var(--border)" }}
        >
          <GapBar />
        </div>
      ) : null}

      <div className="mt-6">
        {error ? (
          <div className="text-sm text-destructive border border-destructive/30 rounded-lg px-4 py-3">
            {error}
          </div>
        ) : showSpinner ? (
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground" />
              Loading live data… first load can take up to 30 seconds.
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-28 rounded-lg border border-border bg-muted/40 animate-pulse"
                />
              ))}
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {Array.from({ length: 2 }).map((_, i) => (
                <div
                  key={i}
                  className="h-24 rounded-lg border border-border bg-muted/40 animate-pulse"
                />
              ))}
            </div>
          </div>
        ) : (
          children
        )}
      </div>
    </main>
  );
}
