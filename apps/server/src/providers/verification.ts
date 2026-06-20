import type { VerificationTier } from "@rep/shared";
import { marketConfig } from "@rep/shared";
import { store } from "../store/memory.js";
import type { VerificationProvider, VerificationTierInfo } from "./types.js";

/**
 * Verification tiers (market-appropriate). Tier 1's meaning is market-specific
 * (jamaica: title/registration reference; us: title/escrow reference).
 */
const TIER_LABELS: Record<Exclude<VerificationTier, 0>, string> = {
  1: marketConfig.tier1Label,
  2: "Verified agent / owner identity (ID + contact)",
  3: "In-person photo confirmation (geo/time-stamped)",
};

export const storeVerificationProvider: VerificationProvider = {
  tier1Label: marketConfig.tier1Label,
  breakdown(listingId: string): VerificationTierInfo[] {
    const records = store.verificationsFor(listingId);
    return ([1, 2, 3] as const).map((tier) => {
      const rec = records.find((r) => r.tier === tier);
      return {
        tier,
        label: TIER_LABELS[tier],
        achieved: Boolean(rec),
        method: rec?.method,
        verifiedAt: rec?.verifiedAt,
      } satisfies VerificationTierInfo;
    });
  },
};
