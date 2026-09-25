// ============================================================================
// AE WEBINAR CATALOG
// ============================================================================
// The 6-topic Account Engineering webinar curriculum. Hardcoded deliberately:
// there is no Snowflake table for this, and scraping snowflake.com at runtime
// would make the app dependent on their page markup.
//
// HOW TO MAINTAIN
//   When new sessions are scheduled, append rows. Do NOT delete past ones —
//   a passed session becomes an on-demand recording at the same URL and stays
//   useful. Your slide notes each topic runs twice through FY27, so the second
//   run is 6 appended rows with no structural change.
//
// LIVE vs ON-DEMAND
//   Derived from the date alone, no extra data needed. Verified against the
//   live pages: a future session shows "REGISTER NOW" with a date/time block;
//   once it passes, the same URL shows "WATCH NOW" and the time block is gone.
//   That's why `time` is nullable.
// ============================================================================

export interface WebinarSession {
  /** 1-6, matches the curriculum order and the topic detection in DEALS_SQL. */
  topicId: 1 | 2 | 3 | 4 | 5 | 6;
  topic: string;
  /** "YYYY-MM-DD". Drives live vs on-demand automatically. */
  date: string;
  /** Populated for live sessions only — on-demand pages drop the time. */
  time: string | null;
  speaker: string;
  /** Same URL in both states; the page itself changes Register -> Watch now. */
  url: string;
}

export type SessionState = "live" | "on-demand";

export const WEBINAR_SESSIONS: WebinarSession[] = [
  {
    topicId: 1,
    topic: "Securing Your Snowflake Account",
    date: "2026-08-07",
    time: null, // passed — now an on-demand recording
    speaker: "Joviane Bellegarde",
    url: "https://www.snowflake.com/en/webinars/customer-webinar/securing-your-snowflake-account-2026-08-07/",
  },
  {
    topicId: 2,
    topic: "Warehouse Design & Cost Control",
    date: "2026-08-21",
    time: "11:00 AM ET",
    speaker: "Dureti Shemsi",
    url: "https://www.snowflake.com/en/webinars/customer-webinar/warehouse-design-cost-control-2026-08-21/",
  },
  {
    topicId: 3,
    topic: "Getting Data into Snowflake",
    date: "2026-09-11",
    time: "11:00 AM ET",
    speaker: "Allison Haberle & Alex Trepes",
    url: "https://www.snowflake.com/en/webinars/customer-webinar/getting-data-into-snowflake-2026-09-11/",
  },
  {
    topicId: 4,
    topic: "Raw Data to Production Dashboards",
    date: "2026-09-18",
    time: "11:00 AM ET",
    speaker: "Dureti Shemsi",
    url: "https://www.snowflake.com/en/webinars/customer-webinar/raw-data-to-production-dashboards-2026-09-18/",
  },
  {
    topicId: 5,
    topic: "AI Without the PhD",
    date: "2026-10-02",
    time: "11:00 AM ET",
    speaker: "Micah Vandersteen",
    url: "https://www.snowflake.com/en/webinars/customer-webinar/ai-without-the-phd-cortex-ai-2026-10-02/",
  },
  {
    topicId: 6,
    topic: "Governance at Scale",
    date: "2026-10-16",
    time: "11:00 AM ET",
    speaker: "Alex Trepes",
    url: "https://www.snowflake.com/en/webinars/customer-webinar/governance-at-scale-2026-10-16/",
  },
];

/** Future date = still live and registerable. Past = on-demand recording. */
export function sessionState(session: WebinarSession, today?: Date): SessionState {
  const t = today ?? new Date();
  const d = new Date(session.date + "T00:00:00");
  return d >= t ? "live" : "on-demand";
}

/**
 * Resolve a matched topic to something we can actually offer the customer.
 *
 * Prefers the soonest upcoming live session; falls back to the most recent
 * recording. This is why a matched topic NEVER produces a dead end — before
 * the on-demand behaviour was understood, a topic whose only session had
 * passed would render a blank cell.
 */
export function bestSessionForTopic(
  topicId: number,
  today?: Date,
): WebinarSession | null {
  const all = WEBINAR_SESSIONS.filter((s) => s.topicId === topicId);
  if (all.length === 0) return null;

  const t = today ?? new Date();
  const live = all
    .filter((s) => sessionState(s, t) === "live")
    .sort((a, b) => a.date.localeCompare(b.date));

  if (live.length > 0) return live[0]; // soonest upcoming
  return all.sort((a, b) => b.date.localeCompare(a.date))[0] ?? null; // latest recording
}

/** Cell label: "Sep 11 · 11:00 AM ET" for live, "On demand" for a recording. */
export function sessionLabel(session: WebinarSession, today?: Date): string {
  const state = sessionState(session, today);
  if (state === "live" && session.time) {
    const d = new Date(session.date + "T00:00:00");
    const mo = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return `${mo} · ${session.time}`;
  }
  return "On demand";
}
