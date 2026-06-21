import { formatMoney } from "./config.js";
import type { CoachRead, DealScore, Listing, ListingSignals } from "./types.js";

/**
 * Offer-band anchors derived purely from observed signals (current price +
 * Deal Score leverage). These are the ONLY numbers the Coach uses — neither the
 * AI nor the mock invents prices.
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

export interface CoachAnchors {
  open: number;
  target: number;
  walk: number;
}

export interface CoachInputData {
  listing: Listing;
  signals: ListingSignals;
  anchors: CoachAnchors;
}

/**
 * Deterministic mock Coach read, reasoned from the signals. Used as the server's
 * fallback when no Claude key is set, and as the engine for the static web demo.
 * Same shape Claude returns.
 */
export function buildMockCoach(input: CoachInputData): CoachRead {
  const { signals, anchors } = input;
  const cutPct = (signals.totalPriceCutPct * 100).toFixed(0);

  const parts: string[] = [`Sat ${signals.daysOnMarket} days`];
  if (signals.priceCutCount > 0) parts.push(`dropped ${signals.priceCutCount}× (−${cutPct}%)`);
  if (signals.compsAvailable && signals.listToCompDeltaPct !== null) {
    const d = (signals.listToCompDeltaPct * 100).toFixed(0);
    parts.push(
      signals.listToCompDeltaPct >= 0
        ? `priced ~${d}% above nearby sales`
        : `priced ~${Math.abs(Number(d))}% below nearby sales`,
    );
  } else {
    parts.push("comps unavailable here — read is days-on-market + price cuts only");
  }
  const leverageWord =
    signals.daysOnMarket > 90 || signals.priceCutCount >= 2
      ? "you have real leverage"
      : "some room to negotiate";
  const headline = `${parts.join(" · ")} — ${leverageWord}.`;

  const notes: string[] = [];
  if (signals.priceCutCount > 0) {
    notes.push(
      "The seller has already moved on price — that signals motivation, so a measured opening offer is reasonable.",
    );
  }
  if (signals.daysOnMarket > 90) {
    notes.push("A long time on market usually means fewer competing buyers; you can take your time.");
  }
  if (!signals.compsAvailable) {
    notes.push(
      "Without nearby sales data, anchor your number to what you can comfortably afford, not to the asking price.",
    );
  }
  notes.push("These are starting points — get a licensed agent or attorney to review before you submit.");

  return {
    headline,
    band: {
      open: anchors.open,
      target: anchors.target,
      walk: anchors.walk,
      openReasoning: `Open at ${formatMoney(anchors.open)} — below asking to leave negotiating room, but credible enough to keep the seller at the table.`,
      targetReasoning: `Target ${formatMoney(anchors.target)} — a realistic settle point given the time on market and ${signals.priceCutCount} price cut(s).`,
      walkReasoning: `Walk at ${formatMoney(anchors.walk)} — above this the deal stops making sense for your budget; be ready to step away.`,
    },
    notes,
    compsAvailable: signals.compsAvailable,
    source: "mock",
  };
}
