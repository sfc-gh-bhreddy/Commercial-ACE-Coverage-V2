"use client";

import { useState, useMemo } from "react";
import { useCoverage } from "@/components/coverage-provider";
import { recommend } from "@/lib/recommend";
import { sessionLabel, sessionState } from "@/lib/webinars";
import type { Deal } from "@/lib/types";
import { PageShell } from "@/components/page-shell";

const MOTION_COLORS: Record<string, { background: string; color: string }> = {
  ASE: { background: "#dbeafe", color: "#1e40af" },
  Bluebird: { background: "#dcfce7", color: "#166534" },
  Webinar: { background: "#fef9c3", color: "#854d0e" },
};

function formatUsd(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1000) return `$${Math.round(v / 1000).toLocaleString()}K`;
  return `$${Math.round(v).toLocaleString()}`;
}

function regionLabel(r: string): string {
  if (r === "Comm East") return "East";
  if (r === "Comm West") return "West";
  return r;
}

type FilterMode = "all" | "bluebird" | "webinar" | "ase" | "si" | "partner" | "ps" | "partneracct" | "odflip";

/** Suppression pill for a deal, in precedence order (first match wins). */
function suppressionPill(d: Deal): { label: string; bg: string; fg: string } | null {
  if (d.isSiInvolved) return { label: "SI involved", bg: "#f3e8ff", fg: "#6b21a8" };
  if (d.isPartnerInvolved) return { label: "Partner involved", bg: "#ffedd5", fg: "#9a3412" };
  if (d.isPsInvolved) return { label: "PS involved", bg: "#e0f2fe", fg: "#075985" };
  if (d.isPartnerAccount) return { label: "Partner acct", bg: "#fae8ff", fg: "#86198f" };
  if (d.isOdFlip) return { label: "OD flip", bg: "#fce7f3", fg: "#9d174d" };
  return null;
}

export default function SuggestedPlaysPage() {
  const { quarterDeals, loading } = useCoverage();
  const [filter, setFilter] = useState<FilterMode>("all");
  const [search, setSearch] = useState("");

  const rows = useMemo(() => {
    return quarterDeals.map((d) => ({
      deal: d,
      rec: recommend(d),
    }));
  }, [quarterDeals]);

  const filtered = useMemo(() => {
    let list = rows;

    if (filter === "bluebird") list = list.filter((r) => r.rec.motions.includes("Bluebird"));
    else if (filter === "webinar") list = list.filter((r) => r.rec.motions.includes("Webinar"));
    else if (filter === "ase") list = list.filter((r) => r.rec.motions.includes("ASE"));
    else if (filter === "si") list = list.filter((r) => r.deal.isSiInvolved);
    else if (filter === "partner") list = list.filter((r) => r.deal.isPartnerInvolved);
    else if (filter === "ps") list = list.filter((r) => r.deal.isPsInvolved);
    else if (filter === "partneracct") list = list.filter((r) => r.deal.isPartnerAccount);
    else if (filter === "odflip") list = list.filter((r) => r.deal.isOdFlip);

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          (r.deal.accountName ?? "").toLowerCase().includes(q) ||
          (r.deal.owner ?? "").toLowerCase().includes(q) ||
          (r.deal.district ?? "").toLowerCase().includes(q)
      );
    }

    return list;
  }, [rows, filter, search]);

  const counts = useMemo(() => {
    let bluebird = 0, webinar = 0, ase = 0, si = 0,
        partner = 0, ps = 0, partneracct = 0, odflip = 0;
    for (const r of rows) {
      if (r.deal.isSiInvolved) si++;
      if (r.deal.isPartnerInvolved) partner++;
      if (r.deal.isPsInvolved) ps++;
      if (r.deal.isPartnerAccount) partneracct++;
      if (r.deal.isOdFlip) odflip++;
      if (r.rec.motions.includes("Bluebird")) bluebird++;
      if (r.rec.motions.includes("Webinar")) webinar++;
      if (r.rec.motions.includes("ASE")) ase++;
    }
    return { all: rows.length, bluebird, webinar, ase, si, partner, ps, partneracct, odflip };
  }, [rows]);

  const FILTERS: { key: FilterMode; label: string; count: number; bg: string; fg: string }[] = [
    { key: "all", label: "All", count: counts.all, bg: "var(--muted)", fg: "var(--foreground)" },
    { key: "ase", label: "ASE", count: counts.ase, bg: "#dbeafe", fg: "#1e40af" },
    { key: "bluebird", label: "Bluebird", count: counts.bluebird, bg: "#dcfce7", fg: "#166534" },
    { key: "webinar", label: "Webinar", count: counts.webinar, bg: "#fef9c3", fg: "#854d0e" },
    { key: "si", label: "SI involved", count: counts.si, bg: "#f3e8ff", fg: "#6b21a8" },
    { key: "partner", label: "Partner involved", count: counts.partner, bg: "#ffedd5", fg: "#9a3412" },
    { key: "ps", label: "PS involved", count: counts.ps, bg: "#e0f2fe", fg: "#075985" },
    { key: "partneracct", label: "Partner acct", count: counts.partneracct, bg: "#fae8ff", fg: "#86198f" },
    { key: "odflip", label: "OD flip", count: counts.odflip, bg: "#fce7f3", fg: "#9d174d" },
  ];

  return (
    <PageShell
      title="Suggested Plays"
      description="Recommended action for each FY27 Cap1 deal based on deal size, consumption, and partner signals."
      showQuarterFilter
    >
      {/* Filter bar */}
      <div className="flex items-center gap-2 flex-wrap mb-4">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className="rounded-full px-3 py-1 text-[12px] font-medium transition-all"
            style={{
              background: filter === f.key ? f.bg : "transparent",
              color: filter === f.key ? f.fg : "var(--muted-foreground)",
              border: filter === f.key ? "none" : "1px solid var(--border)",
            }}
          >
            {f.label} ({f.count})
          </button>
        ))}
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search account, AE, district..."
          className="ml-auto rounded-md border px-3 py-1.5 text-[12px] outline-none focus:ring-2 focus:ring-blue-400/40 w-56"
          style={{ borderColor: "var(--border)", background: "var(--card)", color: "var(--foreground)" }}
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border" style={{ borderColor: "var(--border)" }}>
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b text-left text-muted-foreground text-[11px] uppercase tracking-wider" style={{ borderColor: "var(--border)", background: "var(--muted)" }}>
              <th className="px-3 py-2.5 font-medium">Account</th>
              <th className="px-3 py-2.5 font-medium">Region</th>
              <th className="px-3 py-2.5 font-medium">AE</th>
              <th className="px-3 py-2.5 font-medium text-right">Cap1 ACV</th>
              <th className="px-3 py-2.5 font-medium">Status</th>
              <th className="px-3 py-2.5 font-medium">Suggested play</th>
              <th className="px-3 py-2.5 font-medium">Webinar topic</th>
              <th className="px-3 py-2.5 font-medium">Reason</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(({ deal: d, rec }, i) => (
              <tr
                key={`${d.opportunityId}-${d.fqNum}-${i}`}
                className="border-b border-border/60 last:border-0 hover:bg-muted/40 transition-colors"
              >
                <td className="px-3 py-2.5 font-medium">{d.accountName ?? "—"}</td>
                <td className="px-3 py-2.5">{regionLabel(d.region)}</td>
                <td className="px-3 py-2.5">{d.owner ?? "—"}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{formatUsd(d.cap1Acv)}</td>
                <td className="px-3 py-2.5">
                  <span
                    className="rounded-full px-2 py-0.5 text-[11px] font-medium"
                    style={
                      d.coverageStatus === "Covered"
                        ? { background: "#dbeafe", color: "#1e40af" }
                        : { background: "#fee2e2", color: "#991b1b" }
                    }
                  >
                    {d.coverageStatus}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {(() => {
                      const pill = suppressionPill(d);
                      if (pill) {
                        return (
                          <span
                            className="rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap"
                            style={{ background: pill.bg, color: pill.fg }}
                          >
                            {pill.label}
                          </span>
                        );
                      }
                      if (rec.motions.length === 0) {
                        return <span className="text-xs text-muted-foreground">—</span>;
                      }
                      return rec.motions.map((m) => (
                        <span
                          key={m}
                          className="rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap"
                          style={MOTION_COLORS[m] ?? { background: "#e5e7eb", color: "#374151" }}
                        >
                          {m === "ASE" ? "Assign ASE" : m}
                        </span>
                      ));
                    })()}
                  </div>
                </td>
                <td className="px-3 py-2.5 text-[12px]">
                  {rec.bestWebinar ? (
                    <div className="flex items-center gap-2">
                      <span>{rec.bestWebinar.topic}</span>
                      <a
                        href={rec.bestWebinar.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 text-[11px] underline decoration-1 underline-offset-2 hover:opacity-70 whitespace-nowrap"
                        style={{ color: "#29b5e8" }}
                      >
                        {sessionState(rec.bestWebinar) === "live" ? `Register · ${sessionLabel(rec.bestWebinar)}` : "On demand ↗"}
                      </a>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-[12px] text-muted-foreground max-w-[250px]">
                  {rec.drivers[0] ?? "—"}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && !loading && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No deals match the current filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-muted-foreground mt-3">
        {filtered.length} deals shown
      </p>
    </PageShell>
  );
}
