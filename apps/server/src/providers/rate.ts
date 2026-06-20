import { marketConfig } from "@rep/shared";
import type { RateProvider } from "./types.js";

/**
 * Reads the configurable local rate table from MARKET_CONFIG rather than a US
 * rate API. For MARKET=us a live mortgage-rate API would replace this impl.
 */
export const tableRateProvider: RateProvider = {
  table() {
    return marketConfig.rateTable;
  },
  rateForTerm(termYears: number): number {
    const exact = marketConfig.rateTable.find((r) => r.termYears === termYears);
    if (exact) return exact.annualRate;
    // Nearest term by absolute difference.
    const nearest = [...marketConfig.rateTable].sort(
      (a, b) => Math.abs(a.termYears - termYears) - Math.abs(b.termYears - termYears),
    )[0];
    return nearest?.annualRate ?? 0.07;
  },
};
