import type { Comp, Listing, ListingSignals, PriceChange } from "./types.js";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

export function daysBetween(fromIso: string, to: Date = new Date()): number {
  return Math.max(0, Math.round((to.getTime() - new Date(fromIso).getTime()) / MS_PER_DAY));
}

/** Median of a numeric list (returns null for empty). */
export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2
    : (sorted[mid] ?? 0);
}

interface ComputeArgs {
  listing: Listing;
  /** Price history ordered oldest → newest; the first entry is the list price. */
  priceHistory: PriceChange[];
  comps: Comp[];
  /** Whether this market has a comps/MLS source at all. */
  compsAvailable: boolean;
}

/**
 * Derive market signals from a listing's price history and comparable sales.
 * Never invents data: if comps are unavailable, comp-derived fields are null
 * and `compsAvailable` is false so the Coach and Deal Score degrade honestly.
 */
export function computeSignals({
  listing,
  priceHistory,
  comps,
  compsAvailable,
}: ComputeArgs): ListingSignals {
  const ordered = [...priceHistory].sort(
    (a, b) => new Date(a.changedAt).getTime() - new Date(b.changedAt).getTime(),
  );
  const firstListedPrice = ordered[0]?.price ?? listing.price;

  // A "cut" is a strictly downward step between consecutive recorded prices.
  let priceCutCount = 0;
  const priceCutDates: string[] = [];
  for (let i = 1; i < ordered.length; i++) {
    const prev = ordered[i - 1]?.price ?? firstListedPrice;
    const cur = ordered[i]?.price ?? prev;
    if (cur < prev) {
      priceCutCount++;
      priceCutDates.push(ordered[i]?.changedAt ?? listing.listedAt);
    }
  }

  const totalPriceCutPct =
    firstListedPrice > 0 ? Math.max(0, (firstListedPrice - listing.price) / firstListedPrice) : 0;

  const compPrices = comps.map((c) => c.compPrice);
  const medianCompPrice = compsAvailable ? median(compPrices) : null;
  const listToCompDeltaPct =
    medianCompPrice && medianCompPrice > 0
      ? (listing.price - medianCompPrice) / medianCompPrice
      : null;

  return {
    daysOnMarket: daysBetween(listing.listedAt),
    priceCutCount,
    totalPriceCutPct,
    priceCutDates,
    firstListedPrice,
    listToCompDeltaPct,
    compCount: compsAvailable ? comps.length : 0,
    medianCompPrice,
    relistCount: 0,
    expiredAndRelisted: false,
    compsAvailable: compsAvailable && comps.length > 0,
  };
}
