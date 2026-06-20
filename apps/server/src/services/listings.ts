import type { DealScore, GeoPoint, Listing, ScoredListing } from "@rep/shared";
import { computeDealScore, computeSignals, distanceKm } from "@rep/shared";
import { providers } from "../providers/index.js";
import { store } from "../store/memory.js";

/** Build a fully scored listing: signals + Deal Score + optional distance. */
export function scoreListing(listing: Listing, near?: GeoPoint): ScoredListing {
  const { comps, available } = providers.comps.forListing(listing.id);
  const signals = computeSignals({
    listing,
    priceHistory: store.priceHistoryFor(listing.id),
    comps,
    compsAvailable: available,
  });
  const dealScore = computeDealScore(signals);
  const scored: ScoredListing = {
    ...listing,
    signals,
    dealScore,
    distanceKm: near ? Math.round(distanceKm(near, listing.geo) * 10) / 10 : undefined,
  };
  return scored;
}

export function scoreMany(listings: Listing[], near?: GeoPoint): ScoredListing[] {
  return listings.map((l) => scoreListing(l, near));
}

/**
 * Offer-band anchors derived purely from observed signals (current price +
 * Deal Score leverage). These are the ONLY numbers the Coach uses — the AI
 * never invents prices.
 *
 *   leverage = dealScore/100
 *   open  = price × (1 − [4%..14% scaled by leverage])
 *   target= price × (1 − [2%..8%  scaled by leverage])
 *   walk  = asking price (never advise paying above asking in a buyer's frame)
 */
export function computeAnchors(
  listing: Listing,
  dealScore: DealScore,
): { open: number; target: number; walk: number } {
  const leverage = dealScore.score / 100;
  const openDiscount = 0.04 + 0.1 * leverage;
  const targetDiscount = 0.02 + 0.06 * leverage;
  const round = (n: number) => Math.round(n / 100_000) * 100_000;
  return {
    open: round(listing.price * (1 - openDiscount)),
    target: round(listing.price * (1 - targetDiscount)),
    walk: round(listing.price),
  };
}
