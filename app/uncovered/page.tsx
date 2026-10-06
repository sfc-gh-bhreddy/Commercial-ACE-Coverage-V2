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

const REVIEW_SIGNALS = [
  { label: "SI involved", matches: (deal: Deal) => deal.isSiInvolved },
  { label: "Partner involved", matches: (deal: Deal) => deal.isPartnerInvolved },
  { label: "PS involved", matches: (deal: Deal) => deal.isPsInvolved },
  { label: "Partner acct", matches: (deal: Deal) => deal.isPartnerAccount },
  { label: "OD flip", matches: (deal: Deal) => deal.isOdFlip },
];

function signalLabels(deal: Deal): string[] {
  return REVIEW_SIGNALS.filter((signal) => signal.matches(deal)).map((signal) => signal.label);
}

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
  // AE/SE drill-downs keep the existing deal scope, but separate accounts
  // with potential external involvement so they can still be reviewed.
  const isPersonDrill = Boolean(drillSe || drillOwner);
  const filtered = drillLabel ? sorted : sorted.filter((deal) => !deal.hasAnyAse);
  // Partition by account: an opportunity-level registration can flag only one
  // of several deals, but the account should appear in just one section.
  const reviewAccountIds = new Set(
    isPersonDrill ? filtered.filter((deal) => signalLabels(deal).length > 0).map((deal) => deal.accountId) : [],
  );
  const regularDeals = isPersonDrill
    ? filtered.filter((deal) => !reviewAccountIds.has(deal.accountId))
    : filtered;
  const reviewDeals = isPersonDrill
    ? filtered.filter((deal) => reviewAccountIds.has(deal.accountId))
    : [];
  const reviewAccountCount = new Set(reviewDeals.map((deal) => deal.accountId)).size;
  const accountSignals = new Map<string, Set<string>>();
  for (const deal of reviewDeals) {
    const labels = accountSignals.get(deal.accountId) ?? new Set<string>();
    signalLabels(deal).forEach((label) => labels.add(label));
    accountSignals.set(deal.accountId, labels);
  }
  const signalCounts = REVIEW_SIGNALS.map((signal) => ({
    label: signal.label,
    count: [...accountSignals.values()].filter((labels) => labels.has(signal.label)).length,
  })).filter((signal) => signal.count > 0);
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

        {isPersonDrill ? <h2 className="text-sm font-semibold">Accounts without review signals ({new Set(regularDeals.map((deal) => deal.accountId)).size})</h2> : null}
        <DealsTable
          deals={regularDeals}
          showColumns={{ district: true, seManager: true, owner: true }}
        />
        {isPersonDrill ? (
          <section className="flex flex-col gap-3 border-t border-border pt-5" aria-label="Accounts with potential involvement">
            <h2 className="text-sm font-semibold">Accounts with potential involvement ({reviewAccountCount})</h2>
            <p className="text-xs text-muted-foreground">
              These accounts have potential SI, partner, PS, partner-account, or OD-flip signals. Signals can overlap and do not confirm that the account is fully supported. Review each account and add an ASE if needed.
            </p>
            {signalCounts.length > 0 ? (
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {signalCounts.map((signal) => <span key={signal.label}>{signal.label}: {signal.count} account{signal.count === 1 ? "" : "s"}</span>)}
              </div>
            ) : null}
            <DealsTable
              deals={reviewDeals}
              showColumns={{ district: true, seManager: true, owner: true }}
              signalLabels={(deal) => [...(accountSignals.get(deal.accountId) ?? [])]}
            />
            <p className="text-xs text-muted-foreground">
              Potential involvement is a review cue, not a reason to skip outreach. Add ASE support if the account still needs it.
            </p>
          </section>
        ) : null}
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
