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
import { BLUEBIRD_MAX_ACV, HYBRID_MIN_ACV } from "@/lib/constants";
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
 *   SI involved / partner / PS / etc.         -> no action
 *   cap1Acv >  $65k                          -> primarily ASE 1:1
 *   $25k < cap1Acv <= $65k                   -> hybrid consideration
 *   cap1Acv <= $25k                          -> primarily Bluebird + Webinar
 *
 * @param today Injected rather than read from Date.now() so the live/on-demand
 *              boundary is testable and one render stays internally consistent.
 */
export function recommend(deal: Deal, today?: Date): Recommendation {
  const { cap1Acv, consumptionStage, recommendedTopicId } = deal;

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

  // ---- Gate 1: deal size decides the tier -----------------------------------
  // Above $65K: primarily 1:1 ASE.
  if (cap1Acv > BLUEBIRD_MAX_ACV) {
    return {
      motions: ["ASE"],
      bestWebinar: null,
      drivers: [`Cap1 ACV ${fmtAcv(cap1Acv)} — above $65K, consider 1:1 ASE support`],
    };
  }

  const webinar = bestSessionForTopic(topicId, today);

  // Above $25K through $65K: consider hybrid coverage.
  if (cap1Acv > HYBRID_MIN_ACV) {
    return {
      motions: ["ASE", "Bluebird", "Webinar"],
      bestWebinar: webinar,
      drivers: [
        `Cap1 ACV ${fmtAcv(cap1Acv)} — above $25K through $65K, consider hybrid support`,
        "Consider 1:1 ASE alongside Bluebird and a webinar",
      ],
    };
  }

  // Up to and including $25K: primarily Bluebird + Webinar.
  return {
    motions: ["Bluebird", "Webinar"],
    bestWebinar: webinar,
    drivers: [
      `Cap1 ACV ${fmtAcv(cap1Acv)} — up to $25K, primarily Bluebird`,
      consumptionStage === "Not Started"
        ? "Not started — no consumption since close"
        : consumptionStage === "Ramping"
          ? "Ramping — keep momentum with self-service enablement"
          : consumptionStage === "Mature"
            ? "Mature consumption — self-service for expansion topics"
            : "Started slow — low recent activity",
    ],
  };
}

/** Compact currency for driver strings: $1.2M / $47K / $850 */
function fmtAcv(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1000) return `$${Math.round(v / 1000)}K`;
  return `$${Math.round(v)}`;
}
