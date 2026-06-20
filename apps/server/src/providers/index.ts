import { MARKET } from "@rep/shared";
import { aiProvider } from "./ai.js";
import { mlsCompsProvider, noCompsProvider } from "./comps.js";
import { genericGeocodeProvider, offlineGeocodeProvider } from "./geocode.js";
import { mockListingProvider } from "./listing.js";
import { tableRateProvider } from "./rate.js";
import type { Providers } from "./types.js";
import { storeVerificationProvider } from "./verification.js";

/**
 * Market-keyed provider registry. This is the ONE place MARKET selects data
 * sources. Switching MARKET swaps implementations here without UI changes.
 */
function buildProviders(): Providers {
  const base: Omit<Providers, "comps" | "geocode"> = {
    listing: mockListingProvider,
    rate: tableRateProvider,
    verification: storeVerificationProvider,
    ai: aiProvider,
  };

  switch (MARKET) {
    case "us":
      return {
        ...base,
        comps: mlsCompsProvider, // MLS/comps source enabled
        geocode: offlineGeocodeProvider,
      };
    case "jamaica":
    case "caribbean":
      return {
        ...base,
        comps: noCompsProvider, // no MLS — Coach/Deal Score degrade gracefully
        geocode: offlineGeocodeProvider,
      };
    case "generic":
    default:
      return {
        ...base,
        comps: noCompsProvider,
        geocode: genericGeocodeProvider,
      };
  }
}

export const providers = buildProviders();
export type { Providers } from "./types.js";
