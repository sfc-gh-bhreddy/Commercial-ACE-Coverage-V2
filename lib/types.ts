/** Coverage classification for a single Cap1 deal. */
export type CoverageStatus = "Covered" | "No ASE";

/**
 * One Cap1 deal (one row per opportunity x region x fiscal quarter) with its
 * account-level ASE coverage evidence and the sales / SE hierarchy needed for
 * the DM and SEM rollups. This is the single dataset every view derives from.
 */
export interface Deal {
  opportunityId: string;
  accountId: string;
  accountName: string | null;
  /** Raw region code, e.g. "CommAcqEast". Map to a label in the UI layer. */
  region: string;
  /** e.g. "FY27 Q2". */
  fiscalPeriod: string;
  /** 1..4 fiscal-quarter number (trend ordering). */
  fqNum: number;
  /** e.g. "Q2". */
  fiscalQuarter: string;
  /** True when this row's quarter is the current, still-open fiscal quarter. */
  isOpenQuarter: boolean;
  closeDate: string | null;
  cap1Acv: number;
  hasTmr: boolean;
  hasActivationTag: boolean;
  hasUcTeamAse: boolean;
  hasAccountTeamAse: boolean;
  hasAnyAse: boolean;
  /** First timestamped ASE evidence on/before the close date (pre-close signal). */
  hasAseByClose: boolean;
  coverageStatus: CoverageStatus;
  /** DM's book (District). */
  district: string | null;
  /** Regional VP (level above district). */
  rvp: string | null;
  /** AE / opportunity owner. */
  owner: string | null;
  /** SE Manager (deduped to one per account); null => "(No SE manager)". */
  seManager: string | null;
  /** Lead SE on the account (from D_SALESFORCE_ACCOUNT_CUSTOMERS). */
  leadSe: string | null;
  /** ASE attached to the account via Salesforce use case team. */
  assignedAse: string | null;
  assignedAseEmail: string | null;
  /** Fiscal year-to-date consumption revenue for the account (USD). */
  ytdConsumption: number;
  consumptionStage: "Not Started" | "Started Slow" | "Ramping" | "Mature";
  isNewToSnowflake: boolean;
  recommendedTopicId: number | null;
  topicConfidence: "detected" | "inferred";
  /** True when every open (not deployed) use case has an SI partner — fully handled. */
  isSiInvolved: boolean;
  /** SI firm name when known from the use-case record; null otherwise. */
  siPartnerName: string | null;
}

export interface UserContext {
  /** Snowflake login name (CURRENT_USER). */
  login: string;
  /** Human display name from ACCOUNT_USAGE.USERS, if resolvable. */
  displayName: string | null;
  /** CURRENT_ROLE. */
  role: string;
  /** Humanized role used as the greeting title (e.g. "Sales Engineer"). */
  title: string;
  /** Region labels this app is scoped to. */
  regions: string[];
  /** True if the user was matched into the sales hierarchy; false = app scope. */
  matched: boolean;
}
