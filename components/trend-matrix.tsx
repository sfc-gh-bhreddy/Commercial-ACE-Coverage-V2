"use client";

import { byRegionQuarter, quartersInOrder } from "@/lib/aggregate";
import { pct1 } from "@/lib/format";
import { regionLabel } from "@/lib/constants";
import type { Deal } from "@/lib/types";

/**
 * Region x fiscal-quarter ASE coverage matrix for FY27. The current, still-open
 * quarter is de-emphasized (it's incomplete — not a regression).
 */
export function TrendMatrix({ deals }: { deals: Deal[] }) {
  const points = byRegionQuarter(deals);
  const quarters = quartersInOrder(deals);

  const regionOrder: string[] = [];
  const byRegion = new Map<string, Map<number, (typeof points)[number]>>();
  for (const p of points) {
    if (!byRegion.has(p.region)) {
      byRegion.set(p.region, new Map());
      regionOrder.push(p.region);
    }
    byRegion.get(p.region)!.set(p.fqNum, p);
  }

  const periodLabel = (fq: number) =>
    points.find((p) => p.fqNum === fq)?.fiscalPeriod ?? `Q${fq}`;
  const isOpen = (fq: number) =>
    points.some((p) => p.fqNum === fq && p.isOpenQuarter);

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-muted-foreground border-b border-border">
            <th className="text-left font-medium px-4 py-2.5">Region</th>
            {quarters.map((fq) => (
              <th
                key={fq}
                className="text-right font-medium px-4 py-2.5 whitespace-nowrap"
                style={isOpen(fq) ? { opacity: 0.5 } : undefined}
              >
                {periodLabel(fq)}
                {isOpen(fq) ? " (open)" : ""}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {regionOrder.map((region) => {
            const cells = byRegion.get(region)!;
            return (
              <tr
                key={region}
                className="border-b border-border/60 last:border-0"
              >
                <td className="px-4 py-3 font-medium">{regionLabel(region)}</td>
                {quarters.map((fq) => {
                  const p = cells.get(fq);
                  const open = isOpen(fq);
                  return (
                    <td
                      key={fq}
                      className="px-4 py-3 text-right tabular-nums"
                      style={open ? { opacity: 0.5 } : undefined}
                    >
                      {p ? (
                        <div className="flex flex-col items-end gap-0.5">
                          <span className="font-semibold">
                            {pct1(p.pctAnyAse)}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {p.deals} deals
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
