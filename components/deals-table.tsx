"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { ChevronDown, Download } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { regionLabel } from "@/lib/constants";
import { formatUsd, formatDate, dash } from "@/lib/format";
import type { Deal } from "@/lib/types";

function exportSelectedCsv(deals: Deal[]) {
  const cols = [
    { h: "Account", g: (d: Deal) => d.accountName ?? "" },
    { h: "Region", g: (d: Deal) => regionLabel(d.region) },
    { h: "District", g: (d: Deal) => d.district ?? "" },
    { h: "SE Manager", g: (d: Deal) => d.seManager ?? "" },
    { h: "Owner (AE)", g: (d: Deal) => d.owner ?? "" },
    { h: "Quarter", g: (d: Deal) => d.fiscalPeriod },
    { h: "Close Date", g: (d: Deal) => d.closeDate ?? "" },
    { h: "Cap1 ACV", g: (d: Deal) => String(d.cap1Acv) },
    { h: "TTM Consumption", g: (d: Deal) => String(d.ytdConsumption) },
    { h: "Status", g: (d: Deal) => d.coverageStatus },
    { h: "Opportunity ID", g: (d: Deal) => d.opportunityId },
  ];
  function esc(v: string) { return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v }
  const header = cols.map((c) => c.h).join(",");
  const body = deals.map((d) => cols.map((c) => esc(c.g(d))).join(",")).join("\n");
  const blob = new Blob([`${header}\n${body}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `selected-accounts-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}




// --- Sorting ---
type SortDir = "asc" | "desc" | null;
interface SortState { key: string; dir: SortDir }

function getValue(deal: Deal, key: string): string | number | null {
  switch (key) {
    case "account": return deal.accountName?.toLowerCase() ?? "";
    case "region": return regionLabel(deal.region);
    case "district": return deal.district?.toLowerCase() ?? "";
    case "seManager": return deal.seManager?.toLowerCase() ?? "";
    case "owner": return deal.owner?.toLowerCase() ?? "";
    case "quarter": return deal.fqNum;
    case "closeDate": return deal.closeDate ?? "";
    case "acv": return deal.cap1Acv;
    case "ytd": return deal.ytdConsumption;
    case "status": return deal.coverageStatus;
    default: return null;
  }
}

function getFilterValue(deal: Deal, key: string): string {
  switch (key) {
    case "account": return deal.accountName ?? "(No name)";
    case "region": return regionLabel(deal.region);
    case "district": return deal.district ?? "(No district)";
    case "seManager": return deal.seManager ?? "(No SE manager)";
    case "owner": return deal.owner ?? "(No owner)";
    case "quarter": return deal.fiscalQuarter;
    case "status": return deal.coverageStatus;
    default: return "";
  }
}

function sortDeals(deals: Deal[], sort: SortState): Deal[] {
  if (!sort.dir) return deals;
  return [...deals].sort((a, b) => {
    const av = getValue(a, sort.key);
    const bv = getValue(b, sort.key);
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

// --- Column filter dropdown (Google Sheets style) ---
type ColumnFilters = Record<string, Set<string>>;

function ColumnFilterDropdown({
  columnKey,
  deals,
  activeFilter,
  onApply,
  onClose,
}: {
  columnKey: string;
  deals: Deal[];
  activeFilter: Set<string> | undefined;
  onApply: (key: string, selected: Set<string> | undefined) => void;
  onClose: () => void;
}) {
  const allValues = useMemo(() => {
    const vals = new Set<string>();
    for (const d of deals) {
      vals.add(getFilterValue(d, columnKey));
    }
    return Array.from(vals).sort((a, b) => a.localeCompare(b));
  }, [deals, columnKey]);

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
    if (selected.size === allValues.length) {
      onApply(columnKey, undefined);
    } else {
      onApply(columnKey, selected);
    }
    onClose();
  }

  function clear() {
    onApply(columnKey, undefined);
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
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleAll}
            className="rounded"
          />
          <span className="font-medium">(Select all)</span>
        </label>
        {visible.map((val) => (
          <label key={val} className="flex items-center gap-2 px-2 py-1 text-xs cursor-pointer hover:bg-muted/40 rounded">
            <input
              type="checkbox"
              checked={selected.has(val)}
              onChange={() => toggle(val)}
              className="rounded"
            />
            <span className="truncate">{val}</span>
          </label>
        ))}
        {visible.length === 0 && (
          <div className="px-2 py-2 text-xs text-muted-foreground">No matches</div>
        )}
      </div>
      <div className="flex items-center justify-between border-t p-2" style={{ borderColor: "var(--border)" }}>
        <button onClick={clear} className="text-[11px] text-muted-foreground hover:text-foreground">
          Clear filter
        </button>
        <button
          onClick={apply}
          className="rounded px-3 py-1 text-[11px] font-medium"
          style={{ background: "var(--brand-primary)", color: "#fff" }}
        >
          Apply
        </button>
      </div>
    </div>
  );
}

// --- Filterable sort header ---
function FilterableSortHeader({
  label,
  sortKey,
  sort,
  onSort,
  filterable,
  deals,
  columnFilters,
  onApplyFilter,
  openFilter,
  setOpenFilter,
  className,
}: {
  label: string;
  sortKey: string;
  sort: SortState;
  onSort: (key: string) => void;
  filterable?: boolean;
  deals: Deal[];
  columnFilters: ColumnFilters;
  onApplyFilter: (key: string, selected: Set<string> | undefined) => void;
  openFilter: string | null;
  setOpenFilter: (key: string | null) => void;
  className?: string;
}) {
  const active = sort.key === sortKey && sort.dir !== null;
  const hasFilter = columnFilters[sortKey] !== undefined;
  const isOpen = openFilter === sortKey;

  return (
    <th
      className={`font-medium px-3 py-2.5 cursor-pointer select-none hover:text-foreground transition-colors relative ${className ?? "text-left"}`}
    >
      <div className="flex items-center gap-1">
        <span onClick={() => onSort(sortKey)} className="flex items-center">
          {label}
          <SortArrow active={active} dir={active ? sort.dir : null} />
        </span>
        {filterable ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setOpenFilter(isOpen ? null : sortKey);
            }}
            className="ml-0.5 rounded p-0.5 hover:bg-muted/60 transition-colors"
            title={`Filter by ${label}`}
          >
            <ChevronDown
              className="size-3"
              style={hasFilter ? { color: "var(--brand-primary)" } : undefined}
            />
          </button>
        ) : null}
      </div>
      {isOpen && filterable ? (
        <ColumnFilterDropdown
          columnKey={sortKey}
          deals={deals}
          activeFilter={columnFilters[sortKey]}
          onApply={onApplyFilter}
          onClose={() => setOpenFilter(null)}
        />
      ) : null}
    </th>
  );
}

/** Table of Cap1 deals — used for the Uncovered action list and drill-downs. */
export function DealsTable({
  deals,
  showColumns = {},
}: {
  deals: Deal[];
  showColumns?: { district?: boolean; seManager?: boolean; owner?: boolean;  };
}) {
  const [sort, setSort] = useState<SortState>({ key: "acv", dir: "desc" });
  const [filterText, setFilterText] = useState("");
  const [columnFilters, setColumnFilters] = useState<ColumnFilters>({});
  const [openFilter, setOpenFilter] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function handleSort(key: string) {
    setSort((prev) => {
      if (prev.key !== key) return { key, dir: "asc" };
      if (prev.dir === "asc") return { key, dir: "desc" };
      if (prev.dir === "desc") return { key: "", dir: null };
      return { key, dir: "asc" };
    });
  }

  function handleApplyFilter(key: string, selected: Set<string> | undefined) {
    setColumnFilters((prev) => {
      const next = { ...prev };
      if (!selected) {
        delete next[key];
      } else {
        next[key] = selected;
      }
      return next;
    });
  }

  const activeFilterCount = Object.keys(columnFilters).length;

  const toggleRow = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  function downloadSelected() {
    const picks = sorted.filter((d) => selected.has(d.opportunityId));
    if (picks.length === 0) return;
    exportSelectedCsv(picks);
  }

  const filtered = useMemo(() => {
    let result = deals;

    // Text search
    if (filterText.trim()) {
      const q = filterText.toLowerCase();
      result = result.filter((d) =>
        (d.accountName?.toLowerCase().includes(q)) ||
        (d.district?.toLowerCase().includes(q)) ||
        (d.seManager?.toLowerCase().includes(q)) ||
        (d.owner?.toLowerCase().includes(q)) ||
        (d.region?.toLowerCase().includes(q)) ||
        (regionLabel(d.region).toLowerCase().includes(q))
      );
    }

    // Column filters
    for (const [key, allowed] of Object.entries(columnFilters)) {
      result = result.filter((d) => allowed.has(getFilterValue(d, key)));
    }

    return result;
  }, [deals, filterText, columnFilters]);

  const sorted = useMemo(() => sortDeals(filtered, sort), [filtered, sort]);

  const allChecked = sorted.length > 0 && sorted.every((d) => selected.has(d.opportunityId));

  const toggleAll = useCallback(() => {
    if (allChecked) {
      setSelected(new Set());
    } else {
      setSelected(new Set(sorted.map((d) => d.opportunityId)));
    }
  }, [sorted, allChecked]);

  const sharedFilterProps = {
    deals,
    columnFilters,
    onApplyFilter: handleApplyFilter,
    openFilter,
    setOpenFilter,
    sort,
    onSort: handleSort,
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Search/filter bar */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          placeholder="Filter by name, district, SE manager, owner..."
          className="w-full max-w-md rounded-lg border border-border bg-background px-3 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {(filterText || activeFilterCount > 0) && (
          <button
            onClick={() => { setFilterText(""); setColumnFilters({}) }}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Clear all
          </button>
        )}
        {selected.size > 0 && (
          <div
            className="inline-flex items-center gap-3 rounded-lg px-3 py-1.5 text-xs font-medium shrink-0"
            style={{ background: "var(--sidebar-active)" }}
          >
            <span>{selected.size} selected</span>
            <button
              onClick={downloadSelected}
              className="inline-flex items-center gap-1 underline decoration-1 underline-offset-2 hover:opacity-70"
              style={{ color: "var(--brand-primary)" }}
            >
              <Download className="size-3" />
              Download CSV
            </button>
            <button
              onClick={() => setSelected(new Set())}
              className="text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          </div>
        )}
        <span className="text-xs text-muted-foreground ml-auto">
          {sorted.length} deal{sorted.length !== 1 ? "s" : ""}
          {activeFilterCount > 0 ? ` · ${activeFilterCount} column filter${activeFilterCount > 1 ? "s" : ""}` : ""}
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-muted-foreground border-b border-border">
              <th className="px-2 py-2.5 w-10">
                <button
                  onClick={toggleAll}
                  className="flex items-center justify-center size-5 rounded border-2 transition-colors"
                  style={{
                    borderColor: allChecked ? "var(--brand-primary)" : "var(--border)",
                    background: allChecked ? "var(--brand-primary)" : "transparent",
                  }}
                >
                  {allChecked ? (
                    <svg className="size-3" viewBox="0 0 12 12" fill="none"><path d="M2.5 6L5 8.5L9.5 3.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  ) : selected.size > 0 ? (
                    <svg className="size-3" viewBox="0 0 12 12" fill="none"><path d="M3 6H9" stroke="var(--muted-foreground)" strokeWidth="2" strokeLinecap="round"/></svg>
                  ) : null}
                </button>
              </th>
              <FilterableSortHeader label="Account" sortKey="account" filterable className="text-left px-4" {...sharedFilterProps} />
              <FilterableSortHeader label="Region" sortKey="region" filterable {...sharedFilterProps} />
              {showColumns.district ? (
                <FilterableSortHeader label="District" sortKey="district" filterable {...sharedFilterProps} />
              ) : null}
              {showColumns.seManager ? (
                <FilterableSortHeader label="SE Manager" sortKey="seManager" filterable {...sharedFilterProps} />
              ) : null}
              {showColumns.owner ? (
                <FilterableSortHeader label="Owner (AE)" sortKey="owner" filterable {...sharedFilterProps} />
              ) : null}
              <FilterableSortHeader label="Quarter" sortKey="quarter" filterable {...sharedFilterProps} />
              <FilterableSortHeader label="Close date" sortKey="closeDate" {...sharedFilterProps} />
              <FilterableSortHeader label="Cap1 ACV" sortKey="acv" className="text-right" {...sharedFilterProps} />
              <FilterableSortHeader label="TTM consumption" sortKey="ytd" className="text-right" {...sharedFilterProps} />
              <FilterableSortHeader label="Status" sortKey="status" filterable {...sharedFilterProps} />
              <th className="text-left font-medium px-3 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((d, i) => (
              <tr
                key={`${d.opportunityId}-${d.region}-${d.fqNum}-${i}`}
                className="border-b border-border/60 last:border-0 hover:bg-muted/40 transition-colors cursor-pointer"
                onClick={() => toggleRow(d.opportunityId)}
              >
                <td className="px-2 py-2.5">
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleRow(d.opportunityId) }}
                    className="flex items-center justify-center size-5 rounded border-2 transition-colors"
                    style={{
                      borderColor: selected.has(d.opportunityId) ? "var(--brand-primary)" : "var(--border)",
                      background: selected.has(d.opportunityId) ? "var(--brand-primary)" : "transparent",
                    }}
                  >
                    {selected.has(d.opportunityId) ? (
                      <svg className="size-3" viewBox="0 0 12 12" fill="none"><path d="M2.5 6L5 8.5L9.5 3.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    ) : null}
                  </button>
                </td>
                <td className="px-4 py-2.5 font-medium">{dash(d.accountName)}</td>
                <td className="px-3 py-2.5">{regionLabel(d.region)}</td>
                {showColumns.district ? (
                  <td className="px-3 py-2.5">{dash(d.district)}</td>
                ) : null}
                {showColumns.seManager ? (
                  <td className="px-3 py-2.5">{d.seManager ?? "(No SE manager)"}</td>
                ) : null}
                {showColumns.owner ? (
                  <td className="px-3 py-2.5">{dash(d.owner)}</td>
                ) : null}
                <td className="px-3 py-2.5 whitespace-nowrap">
                  {d.fiscalPeriod}
                  {d.isOpenQuarter ? (
                    <span className="ml-1 text-[10px] text-muted-foreground">(open)</span>
                  ) : null}
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap">{formatDate(d.closeDate)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{formatUsd(d.cap1Acv)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{formatUsd(d.ytdConsumption)}</td>
                <td className="px-3 py-2.5">
                  <StatusBadge status={d.coverageStatus} />
                </td>
                <td className="px-3 py-2.5">
                  <a
                    href="https://snowflake.elementum.io/services/4860adda-9a4c-460a-8698-2d7884700c55"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-[12px] font-medium underline decoration-1 underline-offset-2 hover:opacity-70 whitespace-nowrap"
                    style={{ color: "#7cc4f5" }}
                  >
                    Open TMR ↗
                  </a>
                </td>
              </tr>
            ))}
            {sorted.length === 0 ? (
              <tr>
                <td
                  colSpan={12}
                  className="px-4 py-8 text-center text-sm text-muted-foreground"
                >
                  No deals match the current filter.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
