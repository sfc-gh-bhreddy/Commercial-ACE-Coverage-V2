import type { Deal } from "@/lib/types";

/** Grand-total summary. Counts distinct opportunities so an account/opp that
 *  spans regions isn't double-counted across a combined scope. */
export interface Summary {
  deals: number;
  covered: number;
  gap: number;
  acv: number;
  gapAcv: number;
  gapAcvMedian: number;
  pctAnyAse: number;
  pctByClose: number;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export function summarize(deals: Deal[]): Summary {
  // Distinct opportunities (guards against an opp appearing under >1 region).
  const seen = new Set<string>();
  const unique: Deal[] = [];
  for (const d of deals) {
    if (seen.has(d.opportunityId)) continue;
    seen.add(d.opportunityId);
    unique.push(d);
  }
  const n = unique.length;
  const covered = unique.filter((d) => d.hasAnyAse).length;
  const byClose = unique.filter((d) => d.hasAseByClose).length;
  const gapDeals = unique.filter((d) => !d.hasAnyAse);
  const acv = unique.reduce((s, d) => s + d.cap1Acv, 0);
  const gapAcv = gapDeals.reduce((s, d) => s + d.cap1Acv, 0);
  return {
    deals: n,
    covered,
    gap: n - covered,
    acv,
    gapAcv,
    gapAcvMedian: median(gapDeals.map((d) => d.cap1Acv)),
    pctAnyAse: n ? (100 * covered) / n : 0,
    pctByClose: n ? (100 * byClose) / n : 0,
  };
}

/** One aggregated row for a rollup dimension (region / district / SE manager). */
export interface RollupRow {
  key: string;
  label: string;
  deals: number;
  covered: number;
  gap: number;
  acv: number;
  gapAcv: number;
  pctAnyAse: number;
  pctByClose: number;
  /** True when every deal in the group is in the open (incomplete) quarter. */
  allOpenQuarter: boolean;
}

function tally(
  deals: Deal[],
  keyFn: (d: Deal) => string,
  labelFn: (key: string) => string,
): RollupRow[] {
  const map = new Map<string, Deal[]>();
  for (const d of deals) {
    const key = keyFn(d);
    const arr = map.get(key) ?? [];
    arr.push(d);
    map.set(key, arr);
  }
  const out: RollupRow[] = [];
  for (const [key, group] of map) {
    const s = summarize(group);
    out.push({
      key,
      label: labelFn(key),
      deals: s.deals,
      covered: s.covered,
      gap: s.gap,
      acv: s.acv,
      gapAcv: s.gapAcv,
      pctAnyAse: s.pctAnyAse,
      pctByClose: s.pctByClose,
      allOpenQuarter: group.every((d) => d.isOpenQuarter),
    });
  }
  return out;
}

/** Rank a rollup: highest coverage % first, ties broken by deal count. */
function rankByCoverage(rows: RollupRow[]): RollupRow[] {
  return rows.sort(
    (a, b) => b.pctAnyAse - a.pctAnyAse || b.deals - a.deals,
  );
}

export function byRegion(
  deals: Deal[],
  label: (region: string) => string,
): RollupRow[] {
  return rankByCoverage(tally(deals, (d) => d.region, label));
}

const NO_DISTRICT = "(No district)";
const NO_SEM = "(No SE manager)";
const NO_SE = "(No SE)";
const NO_OWNER = "(No owner)";

export function byDistrict(deals: Deal[]): RollupRow[] {
  return rankByCoverage(
    tally(
      deals,
      (d) => d.district ?? NO_DISTRICT,
      (k) => k,
    ),
  );
}

export function bySeManager(deals: Deal[]): RollupRow[] {
  return rankByCoverage(
    tally(
      deals,
      (d) => d.seManager ?? NO_SEM,
      (k) => k,
    ),
  );
}

export function byLeadSe(deals: Deal[]): RollupRow[] {
  return rankByCoverage(
    tally(
      deals,
      (d) => d.leadSe ?? NO_SE,
      (k) => k,
    ),
  );
}

export function byOwner(deals: Deal[]): RollupRow[] {
  return rankByCoverage(
    tally(
      deals,
      (d) => d.owner ?? NO_OWNER,
      (k) => k,
    ),
  );
}

/** Trend point: one region's coverage in one fiscal quarter. */
export interface TrendPoint {
  region: string;
  fqNum: number;
  fiscalPeriod: string;
  fiscalQuarter: string;
  isOpenQuarter: boolean;
  deals: number;
  pctAnyAse: number;
}

/** Coverage by region x FY quarter, ordered by region then FQ_NUM. */
export function byRegionQuarter(deals: Deal[]): TrendPoint[] {
  const map = new Map<string, Deal[]>();
  for (const d of deals) {
    const key = `${d.region}||${d.fqNum}`;
    const arr = map.get(key) ?? [];
    arr.push(d);
    map.set(key, arr);
  }
  const out: TrendPoint[] = [];
  for (const group of map.values()) {
    const s = summarize(group);
    const first = group[0];
    out.push({
      region: first.region,
      fqNum: first.fqNum,
      fiscalPeriod: first.fiscalPeriod,
      fiscalQuarter: first.fiscalQuarter,
      isOpenQuarter: group.every((d) => d.isOpenQuarter),
      deals: s.deals,
      pctAnyAse: s.pctAnyAse,
    });
  }
  return out.sort(
    (a, b) => a.region.localeCompare(b.region) || a.fqNum - b.fqNum,
  );
}

/** Distinct fiscal quarters present, ordered by FQ_NUM (for trend columns). */
export function quartersInOrder(deals: Deal[]): TrendPoint["fqNum"][] {
  const nums = Array.from(new Set(deals.map((d) => d.fqNum)));
  return nums.sort((a, b) => a - b);
}
