import type { GeoPoint, Listing, ScoredListing } from "@rep/shared";
import { computeDealScore, computeSignals, distanceKm } from "@rep/shared";
import { providers } from "../providers/index.js";
import { store } from "../store/memory.js";

// Re-export so existing route imports (`from "../services/listings.js"`) keep working.
export { computeAnchors } from "@rep/shared";

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
