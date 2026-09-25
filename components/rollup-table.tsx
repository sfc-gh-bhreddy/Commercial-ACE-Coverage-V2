"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, ChevronDown } from "lucide-react";
import type { RollupRow } from "@/lib/aggregate";
import { formatUsd, pct1 } from "@/lib/format";
import { CoverageBar } from "@/components/coverage-bar";

function needsAttention(r: RollupRow): boolean {
  return r.deals >= 5 && r.pctAnyAse < 10;
}

// --- Sorting ---
type SortDir = "asc" | "desc" | null;
interface SortState { key: string; dir: SortDir }

function getRollupValue(row: RollupRow, key: string): string | number | null {
  switch (key) {
    case "label": return row.label.toLowerCase();
    case "deals": return row.deals;
    case "acv": return row.acv;
    case "coverage": return row.pctAnyAse;
    case "byClose": return row.pctByClose;
    case "gap": return row.gap;
    case "gapAcv": return row.gapAcv;
    default: return null;
  }
}

function sortRows(rows: RollupRow[], sort: SortState): RollupRow[] {
  if (!sort.dir) return rows;
  return [...rows].sort((a, b) => {
    const av = getRollupValue(a, sort.key);
    const bv = getRollupValue(b, sort.key);
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    let cmp = 0;
    if (typeof av === "number" && typeof bv === "number") {
      cmp = av - bv;
    } else {
      cmp = String(av).localeCompare(String(bv));
    }
    return sort.dir === "desc" ? -cmp : cmp;
  });
}

function SortArrow({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <span className="ml-1 opacity-30">↕</span>;
  return <span className="ml-1">{dir === "asc" ? "↑" : "↓"}</span>;
}

// --- Column filter dropdown ---
function ColumnFilterDropdown({
  values,
  activeFilter,
  onApply,
  onClose,
}: {
  values: string[];
  activeFilter: Set<string> | undefined;
  onApply: (selected: Set<string> | undefined) => void;
  onClose: () => void;
}) {
  const allValues = useMemo(() => [...values].sort((a, b) => a.localeCompare(b)), [values]);
  const [selected, setSelected] = useState<Set<string>>(() =>
    activeFilter ? new Set(activeFilter) : new Set(allValues),
  );
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  const visible = search
    ? allValues.filter((v) => v.toLowerCase().includes(search.toLowerCase()))
    : allValues;

  const allSelected = visible.every((v) => selected.has(v));

  function toggleAll() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        for (const v of visible) next.delete(v);
      } else {
        for (const v of visible) next.add(v);
      }
      return next;
    });
  }

  function toggle(val: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(val)) next.delete(val); else next.add(val);
      return next;
    });
  }

  function apply() {
    if (selected.size === allValues.length) onApply(undefined);
    else onApply(selected);
    onClose();
  }

  function clear() {
    onApply(undefined);
    onClose();
  }

  return (
    <div
      ref={ref}
      className="absolute top-full left-0 z-50 mt-1 w-56 rounded-lg border shadow-xl"
      style={{ background: "var(--card)", borderColor: "var(--border)" }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="p-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search..."
          className="w-full rounded border border-border bg-background px-2 py-1 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          autoFocus
        />
      </div>
      <div className="max-h-48 overflow-y-auto px-1">
        <label className="flex items-center gap-2 px-2 py-1 text-xs cursor-pointer hover:bg-muted/40 rounded">
          <input type="checkbox" checked={allSelected} onChange={toggleAll} className="rounded" />
          <span className="font-medium">(Select all)</span>
        </label>
        {visible.map((val) => (
          <label key={val} className="flex items-center gap-2 px-2 py-1 text-xs cursor-pointer hover:bg-muted/40 rounded">
            <input type="checkbox" checked={selected.has(val)} onChange={() => toggle(val)} className="rounded" />
            <span className="truncate">{val}</span>
          </label>
        ))}
        {visible.length === 0 && (
          <div className="px-2 py-2 text-xs text-muted-foreground">No matches</div>
        )}
      </div>
      <div className="flex items-center justify-between border-t p-2" style={{ borderColor: "var(--border)" }}>
        <button onClick={clear} className="text-[11px] text-muted-foreground hover:text-foreground">Clear filter</button>
        <button onClick={apply} className="rounded px-3 py-1 text-[11px] font-medium" style={{ background: "var(--brand-primary)", color: "#fff" }}>Apply</button>
      </div>
    </div>
  );
}

export function RollupTable({
  dimensionLabel,
  rows,
  hrefFor,
}: {
  dimensionLabel: string;
  rows: RollupRow[];
  hrefFor?: (row: RollupRow) => string | null;
}) {
  const [sort, setSort] = useState<SortState>({ key: "", dir: null });
  const [filterText, setFilterText] = useState("");
  const [labelFilter, setLabelFilter] = useState<Set<string> | undefined>(undefined);
  const [openFilter, setOpenFilter] = useState(false);

  function handleSort(key: string) {
    setSort((prev) => {
      if (prev.key !== key) return { key, dir: "asc" };
      if (prev.dir === "asc") return { key, dir: "desc" };
      if (prev.dir === "desc") return { key: "", dir: null };
      return { key, dir: "asc" };
    });
  }

  const allLabels = useMemo(() => rows.map((r) => r.label), [rows]);

  const filtered = useMemo(() => {
    let result = rows;
    if (filterText.trim()) {
      const q = filterText.toLowerCase();
      result = result.filter((r) => r.label.toLowerCase().includes(q));
    }
    if (labelFilter) {
      result = result.filter((r) => labelFilter.has(r.label));
    }
    return result;
  }, [rows, filterText, labelFilter]);

  const sorted = useMemo(() => sortRows(filtered, sort), [filtered, sort]);

  const hasFilter = labelFilter !== undefined;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          placeholder={`Filter by ${dimensionLabel.toLowerCase()}...`}
          className="w-full max-w-sm rounded-lg border border-border bg-background px-3 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {(filterText || hasFilter) && (
          <button
            onClick={() => { setFilterText(""); setLabelFilter(undefined); }}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Clear all
          </button>
        )}
        <span className="text-xs text-muted-foreground ml-auto">
          {sorted.length} row{sorted.length !== 1 ? "s" : ""}
          {hasFilter ? " · filtered" : ""}
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-muted-foreground border-b border-border">
              <th className="text-left font-medium px-4 py-2.5 cursor-pointer select-none hover:text-foreground transition-colors relative">
                <div className="flex items-center gap-1">
                  <span onClick={() => handleSort("label")} className="flex items-center">
                    {dimensionLabel}
                    <SortArrow active={sort.key === "label" && sort.dir !== null} dir={sort.key === "label" ? sort.dir : null} />
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); setOpenFilter(!openFilter); }}
                    className="ml-0.5 rounded p-0.5 hover:bg-muted/60 transition-colors"
                    title={`Filter by ${dimensionLabel}`}
                  >
                    <ChevronDown className="size-3" style={hasFilter ? { color: "var(--brand-primary)" } : undefined} />
                  </button>
                </div>
                {openFilter ? (
                  <ColumnFilterDropdown
                    values={allLabels}
                    activeFilter={labelFilter}
                    onApply={(sel) => setLabelFilter(sel)}
                    onClose={() => setOpenFilter(false)}
                  />
                ) : null}
              </th>
              <th className="text-right font-medium px-3 py-2.5 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => handleSort("deals")}>
                Cap1 deals <SortArrow active={sort.key === "deals" && sort.dir !== null} dir={sort.key === "deals" ? sort.dir : null} />
              </th>
              <th className="text-right font-medium px-3 py-2.5 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => handleSort("acv")}>
                Cap1 ACV <SortArrow active={sort.key === "acv" && sort.dir !== null} dir={sort.key === "acv" ? sort.dir : null} />
              </th>
              <th className="px-3 py-2.5 text-left font-medium w-40 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => handleSort("coverage")}>
                ASE coverage <SortArrow active={sort.key === "coverage" && sort.dir !== null} dir={sort.key === "coverage" ? sort.dir : null} />
              </th>
              <th className="text-right font-medium px-3 py-2.5 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => handleSort("byClose")}>
                % by close <SortArrow active={sort.key === "byClose" && sort.dir !== null} dir={sort.key === "byClose" ? sort.dir : null} />
              </th>
              <th className="text-right font-medium px-3 py-2.5 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => handleSort("gap")}>
                Gap deals <SortArrow active={sort.key === "gap" && sort.dir !== null} dir={sort.key === "gap" ? sort.dir : null} />
              </th>
              <th className="text-right font-medium px-3 py-2.5 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => handleSort("gapAcv")}>
                Gap ACV <SortArrow active={sort.key === "gapAcv" && sort.dir !== null} dir={sort.key === "gapAcv" ? sort.dir : null} />
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => {
              const href = hrefFor?.(r) ?? null;
              const attn = needsAttention(r);
              return (
                <tr
                  key={r.key}
                  className="border-b border-border/60 last:border-0 hover:bg-muted/40 transition-colors"
                  style={r.allOpenQuarter ? { opacity: 0.55 } : undefined}
                >
                  <td className="px-4 py-2.5">
                    <span className="flex items-center gap-1.5">
                      {href ? (
                        <Link
                          href={href}
                          className="font-medium hover:underline"
                          style={{ color: "var(--brand-primary)" }}
                        >
                          {r.label}
                        </Link>
                      ) : (
                        <span className="font-medium">{r.label}</span>
                      )}
                      {attn ? (
                        <AlertTriangle className="size-3.5" style={{ color: "#92400e" }} />
                      ) : null}
                      {r.allOpenQuarter ? (
                        <span className="text-[10px] text-muted-foreground">(open qtr)</span>
                      ) : null}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{r.deals}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{formatUsd(r.acv)}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="w-12 text-right tabular-nums text-xs">{pct1(r.pctAnyAse)}</span>
                      <div className="flex-1 min-w-16">
                        <CoverageBar covered={r.covered} total={r.deals} height={6} />
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{pct1(r.pctByClose)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{r.gap}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{formatUsd(r.gapAcv)}</td>
                </tr>
              );
            })}
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No rows match the current filter.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
