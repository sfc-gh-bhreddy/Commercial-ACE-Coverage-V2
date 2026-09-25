import type { Deal } from "@/lib/types";
import { regionLabel } from "@/lib/constants";

const COLUMNS: Array<{ header: string; get: (d: Deal) => unknown }> = [
  { header: "Account", get: (d) => d.accountName },
  { header: "Region", get: (d) => regionLabel(d.region) },
  { header: "Fiscal Period", get: (d) => d.fiscalPeriod },
  { header: "Close Date", get: (d) => d.closeDate },
  { header: "Cap1 ACV", get: (d) => d.cap1Acv },
  { header: "TTM Consumption", get: (d) => d.ytdConsumption },
  { header: "Coverage Status", get: (d) => d.coverageStatus },
  { header: "Has Any ASE", get: (d) => (d.hasAnyAse ? "Yes" : "No") },
  { header: "ASE By Close", get: (d) => (d.hasAseByClose ? "Yes" : "No") },
  { header: "District", get: (d) => d.district },
  { header: "RVP", get: (d) => d.rvp },
  { header: "Owner (AE)", get: (d) => d.owner },
  { header: "SE Manager", get: (d) => d.seManager ?? "(No SE manager)" },
  { header: "Opportunity ID", get: (d) => d.opportunityId },
];

function escape(value: unknown): string {
  if (value == null) return "";
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function exportCsv(deals: Deal[], filename: string) {
  const header = COLUMNS.map((c) => c.header).join(",");
  const body = deals
    .map((d) => COLUMNS.map((c) => escape(c.get(d))).join(","))
    .join("\n");
  const csv = `${header}\n${body}`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
