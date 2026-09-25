"use client";

import * as React from "react";
import type { Deal } from "@/lib/types";
import { FOCUS_REGIONS } from "@/lib/constants";

export type RegionFilter = "FOCUS" | "ALL" | string;
export type QuarterFilter = number | "ALL";

interface CoverageState {
  deals: Deal[];
  loading: boolean;
  error: string | null;
  region: RegionFilter;
  setRegion: (r: RegionFilter) => void;
  quarter: QuarterFilter;
  setQuarter: (q: QuarterFilter) => void;
  /** True once the client has mounted and checked localStorage */
  hasMounted: boolean;
  /** deals filtered by the current region selection (quarter-agnostic) */
  visibleDeals: Deal[];
  /** deals filtered by BOTH region and quarter (rollups + uncovered list) */
  quarterDeals: Deal[];
}

const CoverageContext = React.createContext<CoverageState | null>(null);

const CACHE_KEY = "comm-ase-deals-v2";

function readCached(): Deal[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Deal[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
  } catch {
    return null;
  }
}

export function CoverageProvider({ children }: { children: React.ReactNode }) {
  const [deals, setDeals] = React.useState<Deal[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [hasMounted, setHasMounted] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [region, setRegion] = React.useState<RegionFilter>("FOCUS");
  const [quarter, setQuarter] = React.useState<QuarterFilter>("ALL");

  React.useEffect(() => {
    setHasMounted(true);
    let cancelled = false;

    const cached = readCached();
    if (cached) {
      setDeals(cached);
      setLoading(false);
      return () => { cancelled = true; };
    }

    fetch("/api/coverage")
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? "Request failed");
        return body.rows as Deal[];
      })
      .then((data) => {
        if (cancelled) return;
        setDeals(data);
        setError(null);
        try {
          window.localStorage.setItem(CACHE_KEY, JSON.stringify(data));
        } catch {
          // localStorage full/unavailable — non-fatal
        }
      })
      .catch((e) => {
        // Keep showing cached deals on a revalidation failure; only surface the
        // error when we have nothing to display.
        if (cancelled) return;
        setDeals((cur) => {
          if (cur.length === 0) setError(e.message);
          return cur;
        });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const visibleDeals = React.useMemo(() => {
    if (region === "ALL" || region === "FOCUS")
      return deals.filter((d) => FOCUS_REGIONS.includes(d.region));
    return deals.filter((d) => d.region === region);
  }, [deals, region]);

  const quarterDeals = React.useMemo(
    () =>
      quarter === "ALL"
        ? visibleDeals
        : visibleDeals.filter((d) => d.fqNum === quarter),
    [visibleDeals, quarter],
  );

  return (
    <CoverageContext.Provider
      value={{
        deals,
        loading,
        error,
        region,
        setRegion,
        quarter,
        setQuarter,
        hasMounted,
        visibleDeals,
        quarterDeals,
      }}
    >
      {children}
    </CoverageContext.Provider>
  );
}

export function useCoverage() {
  const ctx = React.useContext(CoverageContext);
  if (!ctx) throw new Error("useCoverage must be used within CoverageProvider");
  return ctx;
}
