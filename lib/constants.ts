// ============================================================================
// APP-WIDE CONSTANTS
// ============================================================================
// Every tunable number, threshold, and label lives here. If you need to change
// business logic, this file and lib/recommend.ts are the only two places to look.
// ============================================================================

export const APP_TITLE = "ASE Commercial Coverage";
export const APP_DESCRIPTION =
  "Account Engineer coverage on Cap1 deals across the Commercial org (FY27) \u2014 where you're covered, where the gaps are, and which Cap1s to attach an ASE to next.";
export const LOGO_PATH = "/icon.svg";

// ----------------------------------------------------------------------------
// FISCAL SCOPE
// ----------------------------------------------------------------------------
/** Snowflake FY starts Feb 1. FY27 = Feb 2026 - Jan 2027. Scopes every query. */
export const FISCAL_YEAR = 2027;

// ----------------------------------------------------------------------------
// REGIONS
// ----------------------------------------------------------------------------
// Raw codes as they appear in SDA_CLOSED_OPPORTUNITY_BOOKINGS_VIEW. SQL always
// uses these raw strings; only the UI maps them to friendly labels.
export const COMM_EAST = "CommAcqEast";
export const COMM_WEST = "CommAcqWest";

/** The two Commercial Acquisition regions this app is built for. */
export const FOCUS_REGIONS: string[] = [COMM_EAST, COMM_WEST];

export const REGION_LABELS: Record<string, string> = {
  [COMM_EAST]: "Comm East",
  [COMM_WEST]: "Comm West",
};

/** Friendly label for a raw region code. Falls back to the raw value so an
 *  unmapped region (EntAcqEast, LATAM, MajorsAcq) still renders readably. */
export function regionLabel(region: string | null): string {
  if (!region) return "(No region)";
  return REGION_LABELS[region] ?? region;
}

// ----------------------------------------------------------------------------
// MOTION ROUTING THRESHOLD
// ----------------------------------------------------------------------------
/**
 * The single business rule that splits self-service from human coverage:
 *   below  $50k -> Bluebird + Webinar (and + ASE if new to Snowflake)
 *   at/above    -> Assign an ASE
 *
 * Context worth knowing: 556 of 585 FY27 Cap1 deals are under $100k with a
 * median of ~$20k, so this threshold puts most of the book on self-service by
 * design. ASE capacity is the binding constraint (25 ASEs served 541 accounts
 * company-wide last year), not deal size.
 */
export const BLUEBIRD_MAX_ACV = 65_000;

/** Bluebird private listing. Closed pilot behind a manual quality gate. */
export const BLUEBIRD_LISTING_URL =
  "https://app.snowflake.com/us-east-1/tkc29686/#/data/shared/listing/private/GZT1Z4D9DIT?originTab=shared";

export const BLUEBIRD_BLURB =
  "Self-service native app installed in the customer's own Snowflake account. ~15 min to activate, full foundation in ~1 hour. Free, no SLA.";

// ----------------------------------------------------------------------------
// CONSUMPTION STAGE THRESHOLDS
// ----------------------------------------------------------------------------
/**
 * Trailing-30-day revenue bands that classify how far along an account is.
 * Mirrored in the CONSUMPTION_STAGE CASE expression in lib/data.ts — change
 * both together or the SQL and the UI will disagree.
 *
 * CAVEAT: these numbers are placeholders, not derived from the actual revenue
 * distribution across these accounts. Validate before treating them as truth.
 */
export const STAGE_STARTED_SLOW_MAX = 200;   // < $200/30d  -> Started Slow
export const STAGE_RAMPING_MAX = 5_000;      // < $5000/30d -> Ramping, else Mature

// ----------------------------------------------------------------------------
// CACHE / REFRESH WINDOWS
// ----------------------------------------------------------------------------
// The Cap1 query is warehouse-heavy (~25s cold), so served data is cached and
// refreshed in the background rather than blocking a page load.
export const COVERAGE_TTL_MS = 10 * 60 * 1000;
export const CONTEXT_TTL_MS = 60 * 60 * 1000;
export const KEEPALIVE_MS = 4 * 60 * 1000;          // stop the pool idle-dropping

// ----------------------------------------------------------------------------
// NAVIGATION
// ----------------------------------------------------------------------------
export interface NavItem {
  href: string;
  label: string;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Overview" },
  { href: "/uncovered", label: "ASE Coverage" },
  { href: "/dm", label: "DM Rollup" },
  { href: "/sem", label: "SEM Rollup" },
  { href: "/ae", label: "AE Rollup" },
  { href: "/se", label: "SE Rollup" },
];

// ----------------------------------------------------------------------------
// COVERAGE SIGNAL DEFINITIONS
// ----------------------------------------------------------------------------
/**
 * Specialist types on the Elementum TMR feed that count as ASE coverage.
 * An account is "covered" if ANY of the four signals in DEALS_SQL is present;
 * this is signal (a).
 */
export const ASE_TMR_SPECIALIST_TYPES: string[] = [
  "Account Engineer",
  "Activation SE - AMS Acq ONLY",
];

// ----------------------------------------------------------------------------
// DATA EXCLUSIONS
// ----------------------------------------------------------------------------
/**
 * Misclassified opportunities — flagged as Cap1 but actually REST API /
 * consumption deals. Excluded everywhere. The first one is ~$21.7M and would
 * single-handedly distort every ACV figure in the app.
 */
export const EXCLUDED_OPPORTUNITY_IDS: string[] = [
  "006VI00000zvrqrYAA", // Resolve AI, Inc. — ~$21.7M, FY27 Q2
  "006VI00000xValGYAS", // REST Resolve AI — $40K, FY27 Q1
];

// ----------------------------------------------------------------------------
// UI PALETTES
// ----------------------------------------------------------------------------
/**
 * Pill colours, applied via inline style rather than Tailwind classes so the
 * values can be shared with non-class contexts (SVG fills, chart series).
 * Tuned for the dark Snowsight-style theme.
 */
export const STATUS_PALETTES = {
  success: { bg: "#123524", fg: "#6ee7a8" }, // Bluebird, covered, healthy
  info: { bg: "#12304d", fg: "#7cc4f5" },    // Webinar, informational
  warning: { bg: "#3d2b0c", fg: "#f5c85c" }, // Assign an ASE, needs attention
} as const;

export type StatusTone = keyof typeof STATUS_PALETTES;
