import type { VerificationTier } from "@rep/shared";

/** Mirrors the server's VerificationProvider breakdown shape. */
export interface VerificationTierInfo {
  tier: VerificationTier;
  label: string;
  achieved: boolean;
  method?: string;
  verifiedAt?: string;
}
