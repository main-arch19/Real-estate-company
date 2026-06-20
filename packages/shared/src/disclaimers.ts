/**
 * Versioned, non-dismissable disclaimer text. The version shown at offer-export
 * time is stored with the offer record (compliance requirement).
 */

export const DISCLAIMER_VERSION = "2026-06-20.1";

export const DISCLAIMERS = {
  affordability:
    "Estimates only — not financial advice. Affordability figures use standard debt-to-income ratios and a local rate table; your lender's terms will differ. Review with a licensed mortgage professional before making decisions.",
  coach:
    "Estimates and starting points, not financial or legal advice. The Negotiation Coach reasons from observed market signals, not a valuation. Review any offer with a licensed agent or attorney before submitting.",
  offer:
    "This is a draft for your review, not a binding offer. It cannot be submitted through this app. Estimates and starting points only — have a licensed agent or attorney review and submit any offer.",
  verification:
    "Verification badges reduce but do not eliminate risk. Always confirm title and ownership independently before paying any money.",
  privacy:
    "Your income, debt, and down-payment details are encrypted and stored only on your account. They are never shared with sellers or agents.",
} as const;

export type DisclaimerKey = keyof typeof DISCLAIMERS;
