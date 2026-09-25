// ============================================================================
// MOTION ROUTING — the core business logic of this app
// ============================================================================
// Decides what to recommend for a Cap1 deal that has no ASE attached.
//
// This is a PURE function of data already on the Deal. It runs client-side on
// every render, which is deliberate: it means a webinar flipping from "live" to
// "on demand" overnight needs no query re-run and no cache flush. The daily
// refresh is free.
//
// SCOPE BOUNDARY: this recommends, it never assigns. "Assign an ASE" is wording
// shown to the AE/SE. Nothing is written back to Elementum, Salesforce, or the
// Bluebird allow-list — those are all read-only replicas or manual gates.
// ============================================================================

import type { Deal } from "@/lib/types";
import { BLUEBIRD_MAX_ACV } from "@/lib/constants";
import { bestSessionForTopic } from "@/lib/webinars";
import type { WebinarSession } from "@/lib/webinars";

/** The three plays available. An empty array means no action needed. */
export type Motion = "Bluebird" | "Webinar" | "ASE";

export interface Recommendation {
  /** Empty = no action. Order is display order. */
  motions: Motion[];
  /** Resolved session for the matched topic — live if upcoming, else the recording. */
  bestWebinar: WebinarSession | null;
  /** Human-readable reasons, shown in the UI. A recommendation without a
   *  visible reason gets ignored by DMs, so these are never hidden. */
  drivers: string[];
}

/**
 * Route a deal to a bundle of motions.
 *
 * Evaluation order matters — the ACV gate is checked FIRST. A $200k deal that
 * has never consumed still gets only "Assign an ASE", never Bluebird.
 *
 *   SI involved (all open UCs have SI)       -> no action
 *   Partner involved (any UC has a partner)  -> no action
 *   PS involved (any UC has PS engagement)   -> no action
 *   Partner account (account IS a partner)   -> no action
 *   OD flip (On Demand + Capacity closed won)-> no action
 *   cap1Acv >= $65k                          -> ASE
 *   cap1Acv <  $65k, new to Snowflake        -> Bluebird + Webinar + ASE
 *   cap1Acv <  $65k, all others              -> Bluebird + Webinar
 *
 * @param today Injected rather than read from Date.now() so the live/on-demand
 *              boundary is testable and one render stays internally consistent.
 */
export function recommend(deal: Deal, today?: Date): Recommendation {
  const { cap1Acv, consumptionStage, isNewToSnowflake, recommendedTopicId } = deal;

  // ---- Gate 0: external ownership / partner signals suppress everything -----
  // Every open (not deployed) use case has an SI on it — the account is
  // handled externally, no ASE/webinar/Bluebird motion needed.
  if (deal.isSiInvolved) {
    return {
      motions: [],
      bestWebinar: null,
      drivers: [
        `SI involved — implementation handled externally, no action needed`,
      ],
    };
  }

  // Any use case carries a partner — a partner is already touching the
  // account (Bluebird's ANY rule, broader than the SI gate above).
  if (deal.isPartnerInvolved) {
    return {
      motions: [],
      bestWebinar: null,
      drivers: [
        `Partner involved${deal.partnerName ? ` (${deal.partnerName})` : ""} — a partner is already engaged on a use case`,
      ],
    };
  }

  // Professional Services is advising / proposing / implementing / supporting
  // on any use case — PS owns the activation motion.
  if (deal.isPsInvolved) {
    return {
      motions: [],
      bestWebinar: null,
      drivers: [
        `PS involved (${deal.psEngagement ?? "engaged"}) — Professional Services is engaged on a use case`,
      ],
    };
  }

  // The account itself is a partner (partner TYPE or DCP/DCS flag).
  if (deal.isPartnerAccount) {
    return {
      motions: [],
      bestWebinar: null,
      drivers: [
        "Partner account — the account is itself a partner, no activation play",
      ],
    };
  }

  // Account has both Closed Won On Demand and Capacity opportunities — it is
  // already consuming in a different motion (Bluebird's On-Demand flip rule).
  if (deal.isOdFlip) {
    return {
      motions: [],
      bestWebinar: null,
      drivers: [
        "OD flip — account already has On Demand and Capacity closed won",
      ],
    };
  }

  // Topic 1 (Securing Your Snowflake Account) is the fallback — it's the one
  // thing every brand-new account needs regardless of what else we know.
  const topicId = recommendedTopicId ?? 1;

  // ---- Gate 1: deal size decides self-service vs human ---------------------
  if (cap1Acv >= BLUEBIRD_MAX_ACV) {
    return {
      motions: ["ASE"],
      bestWebinar: null,
      drivers: [`Cap1 ACV ${fmtAcv(cap1Acv)} — at or above $65K, assign an ASE`],
    };
  }

  const webinar = bestSessionForTopic(topicId, today);

  // ---- Gate 3: brand-new accounts get everything --------------------------
  // NOTE: isNewToSnowflake is currently derived from the same zero-lifetime-
  // revenue check as consumptionStage === 'Not Started', so this branch catches
  // every Not Started account and gate 4 only ever fires for Started Slow.
  if (isNewToSnowflake) {
    return {
      motions: ["Bluebird", "Webinar", "ASE"],
      bestWebinar: webinar,
      drivers: [
        `Cap1 ACV ${fmtAcv(cap1Acv)} — below $65K`,
        "New to Snowflake — no prior consumption",
        "ASE included: new accounts benefit from hands-on support",
      ],
    };
  }

  // ---- Gate 4: everything else gets self-service ---------------------------
  // Ramping / Mature accounts fall through here: consumption started, but
  // the topic-matched webinar and Bluebird still apply as next plays.
  const stageDriver =
    consumptionStage === "Ramping"
      ? "Ramping — keep momentum with self-service enablement"
      : consumptionStage === "Mature"
        ? "Mature consumption — self-service for expansion topics"
        : consumptionStage === "Not Started"
          ? "Not started — no consumption since close"
          : "Started slow — low recent activity";
  return {
    motions: ["Bluebird", "Webinar"],
    bestWebinar: webinar,
    drivers: [
      `Cap1 ACV ${fmtAcv(cap1Acv)} — below $65K`,
      stageDriver,
    ],
  };
}

/** Compact currency for driver strings: $1.2M / $47K / $850 */
function fmtAcv(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1000) return `$${Math.round(v / 1000)}K`;
  return `$${Math.round(v)}`;
}
