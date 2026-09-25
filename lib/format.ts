export function formatUsd(value: number | null | undefined): string {
  if (value == null) return "\u2014";
  if (Math.abs(value) >= 1_000_000)
    return `$${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

export function pct(part: number, whole: number): string {
  if (!whole) return "0%";
  return `${((part / whole) * 100).toFixed(1)}%`;
}

/** Format an already-computed percentage value, e.g. 9.75 -> "9.8%". */
export function pct1(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function dash(value: string | null | undefined): string {
  return value && value.trim() !== "" ? value : "\u2014";
}

/** Format an ISO YYYY-MM-DD string as e.g. "Sep 15, 2026" (no timezone shift). */
export function formatDate(value: string | null | undefined): string {
  if (!value) return "\u2014";
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return "\u2014";
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
