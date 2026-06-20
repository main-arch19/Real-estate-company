import { store } from "../store/memory.js";
import type { CompsProvider } from "./types.js";

/**
 * No-MLS markets (jamaica, caribbean, generic): comps are unavailable. The
 * provider reports `available: false` so the Deal Score and Coach degrade
 * gracefully to days-on-market + price-cut signals — never fabricating a comp.
 */
export const noCompsProvider: CompsProvider = {
  marketHasComps: false,
  forListing() {
    return { comps: [], available: false };
  },
};

/**
 * MLS-backed markets (us): pull comparable sales from the store. (No comps are
 * seeded by default; this is the swap target when MARKET=us with a comps feed.)
 */
export const mlsCompsProvider: CompsProvider = {
  marketHasComps: true,
  forListing(listingId: string) {
    const comps = store.compsFor(listingId);
    return { comps, available: true };
  },
};
