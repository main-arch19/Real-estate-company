import type { DealScore, ListingSignals, ScoredListing } from "./types.js";

/**
 * DEAL SCORE (0–100) — higher means more buyer leverage / a better deal.
 *
 * Computed from four signal groups. Each group produces a 0..1 sub-score, then
 * we take a weighted sum and scale to 0..100.
 *
 *   WEIGHTS (must sum to 1.0):
 *     daysOnMarket ........ 0.25  — staleness; more days = more leverage
 *     priceCuts ........... 0.30  — count + cumulative depth of reductions
 *     listToCompDelta ..... 0.30  — listed above comps = more room to negotiate
 *     sellerBehavior ...... 0.15  — relists / expired-and-relisted signal motivation
 *
 * GRACEFUL DEGRADATION (no-MLS markets like jamaica):
 *   When comps are unavailable, the listToCompDelta group cannot be computed.
 *   Rather than fabricate a value, its 0.30 weight is REDISTRIBUTED
 *   proportionally onto the remaining groups (DOM + price cuts + seller),
 *   and `degraded` is set true so the UI can say so.
 */

const WEIGHTS = {
  daysOnMarket: 0.25,
  priceCuts: 0.3,
  listToCompDelta: 0.3,
  sellerBehavior: 0.15,
} as const;

/** Caps used to normalize raw signals into 0..1 sub-scores. */
const DOM_FULL_LEVERAGE_DAYS = 120; // ~4 months on market = max DOM sub-score
const PRICE_CUT_FULL_PCT = 0.15; // 15%+ cumulative cut = max depth sub-score
const COMP_OVERPRICE_FULL_PCT = 0.1; // listed 10%+ over comps = max delta sub-score

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function domSubScore(s: ListingSignals): number {
  return clamp01(s.daysOnMarket / DOM_FULL_LEVERAGE_DAYS);
}

function priceCutSubScore(s: ListingSignals): number {
  // Blend cut frequency (each cut worth 0.25, capped) with cumulative depth.
  const frequency = clamp01(s.priceCutCount * 0.25);
  const depth = clamp01(s.totalPriceCutPct / PRICE_CUT_FULL_PCT);
  return clamp01(frequency * 0.4 + depth * 0.6);
}

function compDeltaSubScore(s: ListingSignals): number | null {
  if (s.listToCompDeltaPct === null) return null;
  // Positive delta (listed above comps) gives the buyer leverage.
  return clamp01(s.listToCompDeltaPct / COMP_OVERPRICE_FULL_PCT);
}

function sellerSubScore(s: ListingSignals): number {
  let v = 0;
  if (s.expiredAndRelisted) v += 0.6;
  v += clamp01(s.relistCount * 0.2);
  return clamp01(v);
}

function bandFor(score: number): DealScore["band"] {
  if (score >= 67) return "strong";
  if (score >= 34) return "moderate";
  return "low";
}

export function computeDealScore(signals: ListingSignals): DealScore {
  const dom = domSubScore(signals);
  const cuts = priceCutSubScore(signals);
  const comp = compDeltaSubScore(signals);
  const seller = sellerSubScore(signals);

  const degraded = comp === null;

  // Active weights — redistribute the comp weight when comps are unavailable.
  let w: { daysOnMarket: number; priceCuts: number; listToCompDelta: number; sellerBehavior: number } = {
    ...WEIGHTS,
  };
  if (degraded) {
    const remaining = WEIGHTS.daysOnMarket + WEIGHTS.priceCuts + WEIGHTS.sellerBehavior;
    const scale = 1 / remaining;
    w = {
      daysOnMarket: WEIGHTS.daysOnMarket * scale,
      priceCuts: WEIGHTS.priceCuts * scale,
      listToCompDelta: 0,
      sellerBehavior: WEIGHTS.sellerBehavior * scale,
    };
  }

  const weighted =
    dom * w.daysOnMarket +
    cuts * w.priceCuts +
    (comp ?? 0) * w.listToCompDelta +
    seller * w.sellerBehavior;

  const score = Math.round(clamp01(weighted) * 100);

  const factors: DealScore["factors"] = [
    {
      label: "Days on market",
      contribution: Math.round(dom * w.daysOnMarket * 100),
      detail: `${signals.daysOnMarket} days listed`,
    },
    {
      label: "Price cuts",
      contribution: Math.round(cuts * w.priceCuts * 100),
      detail:
        signals.priceCutCount > 0
          ? `${signals.priceCutCount} cut(s), down ${(signals.totalPriceCutPct * 100).toFixed(1)}%`
          : "No price cuts yet",
    },
  ];

  if (!degraded && comp !== null) {
    factors.push({
      label: "Price vs. nearby sales",
      contribution: Math.round(comp * w.listToCompDelta * 100),
      detail:
        signals.listToCompDeltaPct! >= 0
          ? `Listed ~${(signals.listToCompDeltaPct! * 100).toFixed(1)}% above comparable sales`
          : `Listed ~${Math.abs(signals.listToCompDeltaPct! * 100).toFixed(1)}% below comparable sales`,
    });
  } else {
    factors.push({
      label: "Price vs. nearby sales",
      contribution: 0,
      detail: "Comparable sales unavailable in this market — score based on days-on-market + price cuts only",
    });
  }

  if (seller > 0) {
    factors.push({
      label: "Seller behavior",
      contribution: Math.round(seller * w.sellerBehavior * 100),
      detail: signals.expiredAndRelisted ? "Expired and re-listed" : "Re-listed",
    });
  }

  return { score, band: bandFor(score), factors, degraded };
}

/**
 * VERIFICATION RANK BOOST — verified listings rank higher by default.
 *
 * The Recommended sort multiplies a base relevance value by this boost so that
 * a higher verification tier wins ties and lifts a listing above unverified
 * ones. Documented factors:
 *   tier 0 (unverified) .. 1.00 (no boost)
 *   tier 1 ............... 1.15
 *   tier 2 ............... 1.30
 *   tier 3 ............... 1.45
 */
export const VERIFICATION_BOOST: Record<number, number> = {
  0: 1.0,
  1: 1.15,
  2: 1.3,
  3: 1.45,
};

export type SortKey = "recommended" | "price" | "newest" | "deal_score" | "days_on_market";

/**
 * Sort scored listings. "recommended" blends Deal Score with the verification
 * boost (and proximity when available) so verified, high-leverage, nearby
 * listings rise to the top.
 */
export function sortListings(listings: ScoredListing[], key: SortKey): ScoredListing[] {
  const arr = [...listings];
  switch (key) {
    case "price":
      return arr.sort((a, b) => a.price - b.price);
    case "newest":
      return arr.sort((a, b) => new Date(b.listedAt).getTime() - new Date(a.listedAt).getTime());
    case "deal_score":
      return arr.sort((a, b) => b.dealScore.score - a.dealScore.score);
    case "days_on_market":
      return arr.sort((a, b) => b.signals.daysOnMarket - a.signals.daysOnMarket);
    case "recommended":
    default:
      return arr.sort((a, b) => recommendedValue(b) - recommendedValue(a));
  }
}

function recommendedValue(l: ScoredListing): number {
  const boost = VERIFICATION_BOOST[l.verificationTier] ?? 1;
  // Proximity bonus: closer listings get up to +20 (decays past ~25km).
  const proximity = l.distanceKm === undefined ? 0 : Math.max(0, 20 - l.distanceKm * 0.8);
  return (l.dealScore.score + proximity) * boost;
}
