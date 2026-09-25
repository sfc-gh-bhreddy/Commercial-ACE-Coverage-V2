import "server-only";
import { querySnowflake, querySnowflakeLongRunning } from "@/lib/snowflake";
import { ASE_TMR_SPECIALIST_TYPES, EXCLUDED_OPPORTUNITY_IDS, FISCAL_YEAR } from "@/lib/constants";
import type { CoverageStatus, Deal, UserContext } from "@/lib/types";

// LOCAL DEV BUILD. All Snowflake access goes through lib/snowflake.ts, which
// here uses your default ~/.snowflake connection (set SNOWFLAKE_CONNECTION_NAME
// to pick a specific one). Queries run as YOU, so the row-access policy on the
// bookings view returns the rows your roles can see. This build runs the LIVE
// query (see getDeals), so any signal you add shows up immediately.
// Queries run on this warehouse; set SNOWFLAKE_WAREHOUSE if you don't have
// USAGE on SNOWADHOC.
const WAREHOUSE = process.env.SNOWFLAKE_WAREHOUSE ?? "SNOWADHOC";

function quoteList(values: string[]): string {
  return values.map((v) => `'${v.replace(/'/g, "''")}'`).join(", ");
}

/** Fast/light queries (identity lookup, keepalive). */
async function runQuery<T = Record<string, unknown>>(
  sqlText: string,
): Promise<T[]> {
  return (await querySnowflake(sqlText, { warehouse: WAREHOUSE })) as T[];
}

/** Heavy/slow deal query (~50-60s cold): async submit + poll. */
async function runQueryLong<T = Record<string, unknown>>(
  sqlText: string,
): Promise<T[]> {
  return (await querySnowflakeLongRunning(sqlText, { warehouse: WAREHOUSE })) as T[];
}

/**
 * Lightweight keepalive so the pooled owner's-rights connection doesn't
 * idle-drop (which would force a slow reconnect + reauth on the next query).
 */
export async function pingConnection(): Promise<void> {
  try {
    await runQuery("SELECT 1");
  } catch (err) {
    console.error("[keepalive] ping failed:", err);
  }
}

/**
 * Single source-of-truth query: one row per Cap1 deal (opportunity x region x
 * fiscal quarter) for FY27, ALL regions, with account-level ASE coverage
 * evidence, the current-open-quarter flag, the DM sales hierarchy (District /
 * RVP / Owner, carried directly on the bookings view), and the SE Manager
 * (deduped to one per account from RAVEN_SE_ACCOUNT_ASSIGNMENTS). Every page
 * (scorecard, trend, regions, uncovered list, DM rollup, SEM rollup) is derived
 * from these rows client-side.
 *
 * ASE attachment is evaluated at the ACCOUNT level and is any of:
 *   (a) ASE TMR on the account, (b) a '#activation'-tagged use case,
 *   (c) ASE role on a use-case team, (d) ASE role on the account team.
 */
export const DEALS_SQL = `
WITH params AS (
  SELECT YEAR(DATEADD(month, 11, CURRENT_DATE))                       AS cur_fy,
         FLOOR((MONTH(DATEADD(month, 11, CURRENT_DATE)) - 1) / 3) + 1 AS cur_fq
),
cap1_base AS (
    SELECT
        OPPORTUNITY_ID, SALESFORCE_ACCOUNT_ID,
        COALESCE(ORIGINAL_OPPORTUNITY_REGION, REGION)     AS HOME_REGION,
        COALESCE(ORIGINAL_OPPORTUNITY_DISTRICT, DISTRICT) AS HOME_DISTRICT,
        REGION                                            AS CREDIT_REGION,
        FISCAL_YEAR, FQ_NUM, FISCAL_QUARTER, CLOSE_DATE, RVP, OWNER, CAP1_ACV,
        PARTNER_ASSISTS
    FROM SALES.RAVEN.SDA_CLOSED_OPPORTUNITY_BOOKINGS_VIEW
    WHERE IS_CAP1 = TRUE
      AND FISCAL_YEAR = ${FISCAL_YEAR}
      ${EXCLUDED_OPPORTUNITY_IDS.length ? `AND OPPORTUNITY_ID NOT IN (${quoteList(EXCLUDED_OPPORTUNITY_IDS)})` : ""}
),
-- The bookings view splits a single opportunity into one row per sales-credit
-- REGION when credit is shared with AEs in other regions. Keying off REGION made
-- a deal appear in multiple regions at once (e.g. account "Mae" surfaced under
-- Comm East though its home region — and its SE coverage — is Comm West). We
-- attribute each opp to its HOME region/district (ORIGINAL_OPPORTUNITY_REGION/
-- _DISTRICT, single-valued per opp) and fold the split credit back into it.
-- cap1_attr: canonical DISTRICT/RVP/OWNER/CLOSE_DATE from the home-region credit
-- row (largest Cap1 ACV as tiebreak) so they describe the real deal owner.
cap1_attr AS (
    SELECT OPPORTUNITY_ID, SALESFORCE_ACCOUNT_ID,
           HOME_REGION, HOME_DISTRICT, FISCAL_YEAR, FQ_NUM, FISCAL_QUARTER,
           CLOSE_DATE, RVP, OWNER, PARTNER_ASSISTS
    FROM cap1_base
    QUALIFY ROW_NUMBER() OVER (
        PARTITION BY OPPORTUNITY_ID, FQ_NUM
        ORDER BY IFF(CREDIT_REGION = HOME_REGION, 0, 1), CAP1_ACV DESC
    ) = 1
),
-- cap1_acv: full Cap1 ACV per opp x FQ (every credit row folded into home region).
cap1_acv AS (
    SELECT OPPORTUNITY_ID, FQ_NUM, SUM(CAP1_ACV) AS CAP1_ACV
    FROM cap1_base
    GROUP BY 1, 2
),
cap1 AS (
    SELECT
        a.OPPORTUNITY_ID, a.SALESFORCE_ACCOUNT_ID,
        a.HOME_REGION   AS REGION,
        a.FISCAL_YEAR, a.FQ_NUM, a.FISCAL_QUARTER, a.CLOSE_DATE,
        a.HOME_DISTRICT AS DISTRICT, a.RVP, a.OWNER,
        v.CAP1_ACV,
        a.PARTNER_ASSISTS
    FROM cap1_attr a
    JOIN cap1_acv  v
      ON v.OPPORTUNITY_ID = a.OPPORTUNITY_ID AND v.FQ_NUM = a.FQ_NUM
),
tmr AS (
    SELECT ACCOUNT_ID AS account_id,
           MIN(CAST(REQUEST_CREATED_DATE AS DATE)) AS first_evidence_date
    FROM SALES.SALES_ENGINEERING.FIELD_SPECIALIST_REQUESTS_DX_ELEMENTUM
    WHERE SPECIALIST_TYPE IN (${quoteList(ASE_TMR_SPECIALIST_TYPES)})
      AND ACCOUNT_ID IS NOT NULL
    GROUP BY 1
),
uc_activation_tag AS (
    SELECT SALESFORCE_ACCOUNT_ID AS account_id,
           MIN(CAST(SALESFORCE_USE_CASE_CREATED_DATE AS DATE)) AS first_evidence_date
    FROM SALES.SE_REPORTING.DD_SOLUTION_ENGINEER_SALESFORCE_USE_CASE
    WHERE SALESFORCE_USE_CASE_IMPLEMENTATION_COMMENTS ILIKE '%#activation%'
      AND SALESFORCE_ACCOUNT_ID IS NOT NULL
    GROUP BY 1
),
uc_team_ace AS (
    SELECT SALESFORCE_ACCOUNT_ID AS account_id,
           MIN(CAST(SALESFORCE_USE_CASE_TEAM_CREATED_AT AS DATE)) AS first_evidence_date
    FROM SALES.SE_REPORTING.DD_SALESFORCE_USE_CASE_TEAM
    WHERE SALESFORCE_USE_CASE_TEAM_ROLE IN ('SE - Account Engineer','SE - Activation')
      AND IS_SALESFORCE_USE_CASE_TEAM_SALESFORCE_DELETED = FALSE
      AND SALESFORCE_ACCOUNT_ID IS NOT NULL
    GROUP BY 1
),
account_team_ace AS (
    SELECT ACCOUNT_ID AS account_id,
           MIN(CAST(CREATED_DATE AS DATE)) AS first_evidence_date
    FROM FIVETRAN.SALESFORCE.ACCOUNT_TEAM_MEMBER
    WHERE TEAM_MEMBER_ROLE IN ('SE - Account Engineer','SE - Activation')
      AND IS_DELETED       = FALSE
      AND _FIVETRAN_DELETED = FALSE
      AND ACCOUNT_ID IS NOT NULL
    GROUP BY 1
),
-- SI (systems integrator) partner involvement, judged by the OPEN use-case mix:
--   all open (not deployed, not lost) UCs have an SI -> "SI involved", suppress
--   even one open UC without SI -> normal recommendations (assign an ASE etc.)
si_partner AS (
    SELECT SALESFORCE_ACCOUNT_ID AS account_id,
           MAX(IFF(IS_PARTNER_ATTACHED = TRUE, SALESFORCE_PARTNER_NAME, NULL)) AS si_partner_name,
           COUNT_IF(NOT IS_DEPLOYED AND NOT IS_LOST
                    AND SALESFORCE_USE_CASE_STAGE NOT IN ('8 - Use Case Lost')) AS open_ucs,
           COUNT_IF(NOT IS_DEPLOYED AND NOT IS_LOST
                    AND SALESFORCE_USE_CASE_STAGE NOT IN ('8 - Use Case Lost')
                    AND IS_PARTNER_ATTACHED = TRUE)             AS open_si_ucs
    FROM SALES.SE_REPORTING.DD_SOLUTION_ENGINEER_SALESFORCE_USE_CASE
    WHERE SALESFORCE_ACCOUNT_ID IS NOT NULL
    GROUP BY 1
),
-- Trailing 12-month consumption revenue per account, matching the window used by
-- the A360 app's "Total Consumption" tile (rolling 12 months anchored to today).
-- Daily account-grain revenue from the A360 consumption view, all revenue categories.
ytd_consumption AS (
    SELECT SALESFORCE_ACCOUNT_ID AS account_id,
           SUM(REVENUE) AS ytd_consumption
    FROM SALES.RAVEN.A360_REVENUE_CONSUMPTION_VIEW
    WHERE SALESFORCE_ACCOUNT_ID IS NOT NULL
      AND GENERAL_DATE >= DATEADD(month, -12, CURRENT_DATE)
      AND GENERAL_DATE <= CURRENT_DATE
    GROUP BY 1
),
-- SE manager resolution. The authoritative "who covers this account" is the
-- lead SE on the account dim (D_SALESFORCE_ACCOUNT_CUSTOMERS.LEAD_SALES_ENGINEER_NAME);
-- their first-line manager is the SE manager. The account-level assignment feed
-- (RAVEN_SE_ACCOUNT_ASSIGNMENTS) is sparse — it often carries only a manager row
-- (FIRST_LINE_MANAGER_NAME null) and dropped real coverage into "(No SE manager)".
--
-- se_person_mgr: person-level SE -> first-line manager (one manager per SE name),
-- scoped to Commercial assignments. Used to look up the lead SE's manager.
se_person_mgr AS (
    SELECT SE_NAME, FIRST_LINE_MANAGER_NAME AS se_manager
    FROM SALES.RAVEN.RAVEN_SE_ACCOUNT_ASSIGNMENTS
    WHERE SE_NAME IS NOT NULL
      AND FIRST_LINE_MANAGER_NAME IS NOT NULL
      AND SEGMENT = 'Commercial'
    QUALIFY ROW_NUMBER() OVER (
        PARTITION BY SE_NAME ORDER BY IFF(IS_MANAGER, 1, 0)
    ) = 1
),
-- Fallback for accounts whose lead SE isn't in the person map: one SE manager
-- per account from the assignment feed (a naive join fanouts / double-counts).
acct_assign_mgr AS (
    SELECT SALESFORCE_ACCOUNT_ID AS account_id, FIRST_LINE_MANAGER_NAME AS se_manager
    FROM SALES.RAVEN.RAVEN_SE_ACCOUNT_ASSIGNMENTS
    WHERE FIRST_LINE_MANAGER_NAME IS NOT NULL
      AND SEGMENT = 'Commercial'
    QUALIFY ROW_NUMBER() OVER (
        PARTITION BY SALESFORCE_ACCOUNT_ID
        ORDER BY IFF(IS_MANAGER, 1, 0), SE_NAME
    ) = 1
),
cons_raw AS (
    SELECT SALESFORCE_ACCOUNT_ID AS account_id,
           SUM(REVENUE) AS lifetime_rev,
           SUM(CASE WHEN GENERAL_DATE >= DATEADD(day,-30,CURRENT_DATE) THEN REVENUE ELSE 0 END) AS last_30d_rev
    FROM SALES.RAVEN.A360_REVENUE_CONSUMPTION_VIEW
    WHERE SALESFORCE_ACCOUNT_ID IS NOT NULL
    GROUP BY 1
),
opp_intent AS (
    SELECT o.ID AS opportunity_id,
        CASE
            WHEN o.USE_CASES_C ILIKE '%AI%' THEN 5
            WHEN NULLIF(TRIM(o.ETL_TOOL_C),'') IS NOT NULL AND TRIM(o.ETL_TOOL_C) NOT IN ('Other','Other / Unknown') THEN 3
            WHEN NULLIF(TRIM(o.CURRENT_DW_TOOL_C),'') IS NOT NULL AND TRIM(o.CURRENT_DW_TOOL_C) NOT IN ('Snowflake','Other','Other / Unknown','Greenfield') THEN 3
            WHEN o.USE_CASES_C ILIKE '%Data Engineering%' THEN 3
            WHEN NULLIF(TRIM(o.CURRENT_BI_TOOL_C),'') IS NOT NULL AND TRIM(o.CURRENT_BI_TOOL_C) NOT IN ('Other','Other / Unknown') THEN 4
            WHEN o.USE_CASES_C ILIKE '%Analytics%' THEN 4
            ELSE 1
        END AS topic_id,
        CASE
            WHEN o.USE_CASES_C ILIKE '%AI%' THEN 'detected'
            WHEN NULLIF(TRIM(o.ETL_TOOL_C),'') IS NOT NULL AND TRIM(o.ETL_TOOL_C) NOT IN ('Other','Other / Unknown') THEN 'detected'
            WHEN NULLIF(TRIM(o.CURRENT_DW_TOOL_C),'') IS NOT NULL AND TRIM(o.CURRENT_DW_TOOL_C) NOT IN ('Snowflake','Other','Other / Unknown','Greenfield') THEN 'detected'
            WHEN o.USE_CASES_C ILIKE '%Data Engineering%' THEN 'detected'
            WHEN NULLIF(TRIM(o.CURRENT_BI_TOOL_C),'') IS NOT NULL AND TRIM(o.CURRENT_BI_TOOL_C) NOT IN ('Other','Other / Unknown') THEN 'detected'
            WHEN o.USE_CASES_C ILIKE '%Analytics%' THEN 'detected'
            ELSE 'inferred'
        END AS topic_confidence
    FROM FIVETRAN.SALESFORCE.OPPORTUNITY o
    WHERE o.IS_DELETED = FALSE
),
-- ace_map: one ACE per account. V_ACE_ACCOUNT_MAP can carry several ACEs per
-- account (e.g. CurbWaste has two); joining it directly fanned deals out into
-- duplicate rows. Keep the ACE with the deepest engagement (most use cases,
-- then most recent touch).
ace_map AS (
    SELECT ACCOUNT_ID, ACE_NAME, ACE_EMAIL
    FROM TEMP.BHREDDY.V_ACE_ACCOUNT_MAP
    QUALIFY ROW_NUMBER() OVER (
        PARTITION BY ACCOUNT_ID
        ORDER BY USE_CASES DESC, LAST_TOUCH DESC
    ) = 1
),
-- deal_reg: approved Salesforce deal registrations on the Cap1 opportunity
-- (the "SPN: Deal Registrations" field). If the opp has an accepted partner
-- registration, SI is involved regardless of the use-case mix.
deal_reg AS (
    SELECT
        SALESFORCE_OPPORTUNITY_ID                          AS opportunity_id,
        MAX(SALESFORCE_DEAL_REGISTRATION_PARTNER_NAME)     AS dr_partner_name
    FROM SNOW_CERTIFIED.PARTNER.DD_SALESFORCE_DEAL_REGISTRATION
    WHERE SALESFORCE_DEAL_REGISTRATION_APPROVAL_STATUS = 'Approved'
    GROUP BY 1
)
SELECT
    c.OPPORTUNITY_ID                                          AS OPPORTUNITY_ID,
    c.SALESFORCE_ACCOUNT_ID                                   AS ACCOUNT_ID,
    acct.SALESFORCE_ACCOUNT_NAME                              AS ACCOUNT_NAME,
    c.REGION                                                  AS REGION,
    'FY' || (c.FISCAL_YEAR - 2000) || ' ' || c.FISCAL_QUARTER AS FISCAL_PERIOD,
    c.FQ_NUM                                                  AS FQ_NUM,
    c.FISCAL_QUARTER                                          AS FISCAL_QUARTER,
    IFF(c.FISCAL_YEAR = p.cur_fy AND c.FQ_NUM = p.cur_fq, TRUE, FALSE) AS IS_OPEN_QUARTER,
    TO_CHAR(c.CLOSE_DATE, 'YYYY-MM-DD')                       AS CLOSE_DATE,
    ROUND(c.CAP1_ACV)                                         AS CAP1_ACV,
    (t.account_id   IS NOT NULL)                              AS HAS_TMR,
    (tag.account_id IS NOT NULL)                              AS HAS_ACTIVATION_TAG,
    (uct.account_id IS NOT NULL)                              AS HAS_UC_TEAM_ACE,
    (att.account_id IS NOT NULL)                              AS HAS_ACCOUNT_TEAM_ACE,
    (t.account_id IS NOT NULL OR tag.account_id IS NOT NULL
     OR uct.account_id IS NOT NULL OR att.account_id IS NOT NULL) AS HAS_ANY_ACE,
    (LEAST(
        COALESCE(t.first_evidence_date,   '9999-12-31'),
        COALESCE(uct.first_evidence_date, '9999-12-31'),
        COALESCE(att.first_evidence_date, '9999-12-31')
    ) <= c.CLOSE_DATE)                                        AS HAS_ACE_BY_CLOSE,
    c.DISTRICT                                                AS DISTRICT,
    c.RVP                                                     AS RVP,
    c.OWNER                                                   AS OWNER,
    COALESCE(spm.se_manager, aam.se_manager)                  AS SE_MANAGER,
    acct.LEAD_SALES_ENGINEER_NAME                             AS LEAD_SE,
    am.ACE_NAME                                               AS ASSIGNED_ACE,
    am.ACE_EMAIL                                              AS ASSIGNED_ACE_EMAIL,
    COALESCE(yc.ytd_consumption, 0)                           AS YTD_CONSUMPTION,
    CASE
        WHEN COALESCE(cr.lifetime_rev, 0) = 0    THEN 'Not Started'
        WHEN COALESCE(cr.last_30d_rev, 0) < 200  THEN 'Started Slow'
        WHEN COALESCE(cr.last_30d_rev, 0) < 5000 THEN 'Ramping'
        ELSE 'Mature'
    END                                                       AS CONSUMPTION_STAGE,
    (COALESCE(cr.lifetime_rev, 0) = 0)                        AS IS_NEW_TO_SNOWFLAKE,
    COALESCE(ah.TOPIC_ID, oi.topic_id, 1)                     AS RECOMMENDED_TOPIC_ID,
    CASE WHEN ah.TOPIC_ID IS NOT NULL THEN 'detected'
         ELSE COALESCE(oi.topic_confidence, 'inferred')
    END                                                       AS TOPIC_CONFIDENCE,     
    (
        (si.account_id IS NOT NULL AND si.open_ucs > 0 AND si.open_ucs = si.open_si_ucs)
        OR dr.opportunity_id IS NOT NULL
    )                                                         AS IS_SI_INVOLVED,
    COALESCE(si.si_partner_name, dr.dr_partner_name)          AS SI_PARTNER_NAME
FROM cap1 c
CROSS JOIN params p
LEFT JOIN tmr               t   ON t.account_id   = c.SALESFORCE_ACCOUNT_ID
LEFT JOIN uc_activation_tag tag ON tag.account_id = c.SALESFORCE_ACCOUNT_ID
LEFT JOIN uc_team_ace       uct ON uct.account_id = c.SALESFORCE_ACCOUNT_ID
LEFT JOIN account_team_ace  att ON att.account_id = c.SALESFORCE_ACCOUNT_ID
LEFT JOIN SALES.RAVEN.D_SALESFORCE_ACCOUNT_CUSTOMERS acct
       ON acct.SALESFORCE_ACCOUNT_ID = c.SALESFORCE_ACCOUNT_ID
LEFT JOIN se_person_mgr    spm ON spm.SE_NAME    = acct.LEAD_SALES_ENGINEER_NAME
LEFT JOIN acct_assign_mgr  aam ON aam.account_id = c.SALESFORCE_ACCOUNT_ID
LEFT JOIN ytd_consumption  yc  ON yc.account_id   = c.SALESFORCE_ACCOUNT_ID
LEFT JOIN cons_raw         cr  ON cr.account_id   = c.SALESFORCE_ACCOUNT_ID
LEFT JOIN opp_intent       oi  ON oi.opportunity_id = c.OPPORTUNITY_ID
LEFT JOIN TEMP.BHREDDY.ACE_TOPIC_HINTS ah ON ah.OPPORTUNITY_ID = c.OPPORTUNITY_ID
LEFT JOIN ace_map am ON am.ACCOUNT_ID = c.SALESFORCE_ACCOUNT_ID
LEFT JOIN si_partner si ON si.account_id = c.SALESFORCE_ACCOUNT_ID
LEFT JOIN deal_reg   dr ON dr.opportunity_id = c.OPPORTUNITY_ID
ORDER BY c.CAP1_ACV DESC
`;

/**
 * LOCAL DEV: getDeals runs the DEALS_SQL builder above LIVE (as you), so edits
 * to the query — including new ASE signals — take effect on the next request.
 * (The deployed SPCS app instead reads a pre-built snapshot table because its
 * service identity can't see the row-secured source; that's a deploy concern,
 * not relevant when you run locally as yourself.)
 */

interface RawDeal {
  OPPORTUNITY_ID: string;
  ACCOUNT_ID: string;
  ACCOUNT_NAME: string | null;
  REGION: string;
  FISCAL_PERIOD: string;
  FQ_NUM: number;
  FISCAL_QUARTER: string;
  IS_OPEN_QUARTER: boolean;
  CLOSE_DATE: string | null;
  CAP1_ACV: number | null;
  HAS_TMR: boolean;
  HAS_ACTIVATION_TAG: boolean;
  HAS_UC_TEAM_ACE: boolean;
  HAS_ACCOUNT_TEAM_ACE: boolean;
  HAS_ANY_ACE: boolean;
  HAS_ACE_BY_CLOSE: boolean;
  DISTRICT: string | null;
  RVP: string | null;
  OWNER: string | null;
  SE_MANAGER: string | null;
  LEAD_SE: string | null;
  ASSIGNED_ACE: string | null;
  ASSIGNED_ACE_EMAIL: string | null;
  YTD_CONSUMPTION: number | null;
  CONSUMPTION_STAGE: string | null;
  IS_NEW_TO_SNOWFLAKE: boolean | null;
  RECOMMENDED_TOPIC_ID: number | null;
  TOPIC_CONFIDENCE: string | null;
  IS_SI_INVOLVED: boolean | null;
  SI_PARTNER_NAME: string | null;
}

function coverageStatus(anyAce: boolean): CoverageStatus {
  return anyAce ? "Covered" : "No ASE";
}

export async function getDeals(): Promise<Deal[]> {
  const rows = await runQueryLong<RawDeal>(DEALS_SQL);
  return rows.map((r) => {
    const anyAce = Boolean(r.HAS_ANY_ACE);
    const tmr = Boolean(r.HAS_TMR);
    return {
      opportunityId: r.OPPORTUNITY_ID,
      accountId: r.ACCOUNT_ID,
      accountName: r.ACCOUNT_NAME,
      region: r.REGION,
      fiscalPeriod: r.FISCAL_PERIOD,
      fqNum: Number(r.FQ_NUM),
      fiscalQuarter: r.FISCAL_QUARTER,
      isOpenQuarter: Boolean(r.IS_OPEN_QUARTER),
      closeDate: r.CLOSE_DATE,
      cap1Acv: r.CAP1_ACV ?? 0,
      hasTmr: tmr,
      hasActivationTag: Boolean(r.HAS_ACTIVATION_TAG),
      hasUcTeamAse: Boolean(r.HAS_UC_TEAM_ACE),
      hasAccountTeamAse: Boolean(r.HAS_ACCOUNT_TEAM_ACE),
      hasAnyAse: anyAce,
      hasAseByClose: Boolean(r.HAS_ACE_BY_CLOSE),
      coverageStatus: coverageStatus(anyAce),
      district: r.DISTRICT,
      rvp: r.RVP,
      owner: r.OWNER,
      seManager: r.SE_MANAGER,
      leadSe: r.LEAD_SE,
      assignedAse: r.ASSIGNED_ACE,
      assignedAseEmail: r.ASSIGNED_ACE_EMAIL,
      ytdConsumption: r.YTD_CONSUMPTION ?? 0,
      consumptionStage: (r.CONSUMPTION_STAGE as Deal["consumptionStage"]) ?? "Not Started",
      isNewToSnowflake: Boolean(r.IS_NEW_TO_SNOWFLAKE),
      recommendedTopicId: r.RECOMMENDED_TOPIC_ID ? Number(r.RECOMMENDED_TOPIC_ID) : null,
      topicConfidence: (r.TOPIC_CONFIDENCE as Deal["topicConfidence"]) ?? "inferred",
      isSiInvolved: Boolean(r.IS_SI_INVOLVED),
      siPartnerName: r.SI_PARTNER_NAME,
    };
  });
}

function humanizeRole(role: string): string {
  return role
    .toLowerCase()
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

let cachedContext: UserContext | null = null;
let contextInFlight: Promise<UserContext> | null = null;

/**
 * Resolves the connected Snowflake user and their humanized role. The app is
 * scoped to the two Commercial Acquisition regions; identity is memoized for the
 * process lifetime (static per session, and the ACCOUNT_USAGE lookup is slow).
 */
export async function getUserContext(): Promise<UserContext> {
  if (cachedContext) return cachedContext;
  if (contextInFlight) return contextInFlight;
  contextInFlight = resolveUserContext().finally(() => {
    contextInFlight = null;
  });
  return contextInFlight;
}

async function resolveUserContext(): Promise<UserContext> {
  let login = "";
  let role = "";
  let displayName: string | null = null;

  try {
    const idRows = await runQuery<{
      LOGIN: string;
      ROLE: string;
      DISPLAY_NAME: string | null;
    }>(
      `SELECT CURRENT_USER() AS login, CURRENT_ROLE() AS role,
              MAX(u.display_name) AS display_name
       FROM SNOWFLAKE.ACCOUNT_USAGE.USERS u
       WHERE u.name = CURRENT_USER() AND u.deleted_on IS NULL`,
    );
    const r = idRows[0];
    login = r?.LOGIN ?? "";
    role = r?.ROLE ?? "";
    displayName = r?.DISPLAY_NAME ?? null;
  } catch {
    const idRows = await runQuery<{ LOGIN: string; ROLE: string }>(
      `SELECT CURRENT_USER() AS login, CURRENT_ROLE() AS role`,
    );
    login = idRows[0]?.LOGIN ?? "";
    role = idRows[0]?.ROLE ?? "";
  }

  cachedContext = {
    login,
    displayName,
    role,
    title: role ? humanizeRole(role) : "",
    regions: ["Comm East", "Comm West"],
    matched: false,
  };
  return cachedContext;
}
