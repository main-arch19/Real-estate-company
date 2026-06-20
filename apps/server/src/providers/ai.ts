import Anthropic from "@anthropic-ai/sdk";
import type { CoachRead } from "@rep/shared";
import { formatMoney } from "@rep/shared";
import { env, hasAnthropic } from "../env.js";
import type { AIProvider, CoachInput } from "./types.js";

/**
 * Negotiation Coach AI provider.
 *
 * RESPONSIBLE-AI CONTRACT:
 *  - Runs server-side only; the API key never reaches the browser.
 *  - The offer-band NUMBERS (open/target/walk) are computed server-side from
 *    observed signals (CoachInput.anchors) and passed to the model. The model
 *    only produces REASONING + a headline + notes — it never invents prices.
 *  - When comps are unavailable, the prompt says so and the model must not
 *    reference comparable sales as if known.
 *  - On any error or when no key is set, we fall back to the deterministic mock
 *    so the feature degrades instead of failing.
 */

const MODEL = "claude-opus-4-8";

interface CoachText {
  headline: string;
  openReasoning: string;
  targetReasoning: string;
  walkReasoning: string;
  notes: string[];
}

const COACH_SCHEMA = {
  type: "object",
  properties: {
    headline: { type: "string" },
    openReasoning: { type: "string" },
    targetReasoning: { type: "string" },
    walkReasoning: { type: "string" },
    notes: { type: "array", items: { type: "string" } },
  },
  required: ["headline", "openReasoning", "targetReasoning", "walkReasoning", "notes"],
  additionalProperties: false,
} as const;

function buildSystemPrompt(): string {
  return [
    "You are a warm, plain-spoken home-buying negotiation coach for first-time buyers in Jamaica.",
    "You reason ONLY from the structured market signals provided. Never invent prices, comparable",
    "sales, or figures that are not in the input. The offer-band numbers (open/target/walk) are",
    "already computed and given to you — explain the reasoning for each in plain language; do not",
    "propose different numbers. Be encouraging but honest, never manipulative or pushy.",
    "If comparable sales were not available, say the read is based on days-on-market and price cuts",
    "and do NOT reference comps as if you knew them. Keep the headline to one sentence.",
  ].join(" ");
}

function buildUserContent(input: CoachInput): string {
  const { listing, signals, anchors } = input;
  return JSON.stringify(
    {
      listing: {
        title: listing.title,
        region: listing.region,
        currentPrice: listing.price,
        type: listing.type,
      },
      signals: {
        daysOnMarket: signals.daysOnMarket,
        priceCutCount: signals.priceCutCount,
        totalPriceCutPct: Number((signals.totalPriceCutPct * 100).toFixed(1)),
        firstListedPrice: signals.firstListedPrice,
        comparableSalesAvailable: signals.compsAvailable,
        listToCompDeltaPct:
          signals.listToCompDeltaPct === null
            ? null
            : Number((signals.listToCompDeltaPct * 100).toFixed(1)),
      },
      offerBand: anchors,
      instructions:
        "Write a one-line leverage read (headline), reasoning for the open/target/walk numbers, " +
        "and 2-4 short strategy notes for a first-time buyer.",
    },
    null,
    2,
  );
}

async function callClaude(input: CoachInput): Promise<CoachText> {
  const client = new Anthropic({ apiKey: env.anthropicApiKey });
  // Documented wire shape (adaptive thinking + structured output, claude-opus-4-8).
  // The installed SDK's types lag these fields; the client forwards them as-is,
  // so we build the payload as a plain object and cast through `unknown`.
  const params = {
    model: MODEL,
    max_tokens: 2048,
    thinking: { type: "adaptive" },
    system: buildSystemPrompt(),
    messages: [{ role: "user", content: buildUserContent(input) }],
    output_config: { format: { type: "json_schema", schema: COACH_SCHEMA } },
  };
  const res = await client.messages.create(
    params as unknown as Anthropic.MessageCreateParamsNonStreaming,
  );

  const textBlock = res.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") throw new Error("no text block");
  return JSON.parse(textBlock.text) as CoachText;
}

/** Deterministic mock — same structure as Claude, reasoned from the signals. */
function mockCoachText(input: CoachInput): CoachText {
  const { listing, signals, anchors } = input;
  const cutPct = (signals.totalPriceCutPct * 100).toFixed(0);

  const parts: string[] = [];
  parts.push(`Sat ${signals.daysOnMarket} days`);
  if (signals.priceCutCount > 0) {
    parts.push(`dropped ${signals.priceCutCount}× (−${cutPct}%)`);
  }
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
    signals.daysOnMarket > 90 || signals.priceCutCount >= 2 ? "you have real leverage" : "some room to negotiate";
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
    openReasoning: `Open at ${formatMoney(anchors.open)} — below asking to leave negotiating room, but credible enough to keep the seller at the table.`,
    targetReasoning: `Target ${formatMoney(anchors.target)} — a realistic settle point given the time on market and ${signals.priceCutCount} price cut(s).`,
    walkReasoning: `Walk at ${formatMoney(anchors.walk)} — above this the deal stops making sense for your budget; be ready to step away.`,
    notes,
  };
}

function assemble(input: CoachInput, text: CoachText, source: "claude" | "mock"): CoachRead {
  return {
    headline: text.headline,
    band: {
      open: input.anchors.open,
      target: input.anchors.target,
      walk: input.anchors.walk,
      openReasoning: text.openReasoning,
      targetReasoning: text.targetReasoning,
      walkReasoning: text.walkReasoning,
    },
    notes: text.notes,
    compsAvailable: input.signals.compsAvailable,
    source,
  };
}

export const aiProvider: AIProvider = {
  async coach(input: CoachInput): Promise<CoachRead> {
    if (hasAnthropic) {
      try {
        const text = await callClaude(input);
        return assemble(input, text, "claude");
      } catch (err) {
        console.warn("[ai] Claude call failed, using mock fallback:", err);
      }
    }
    return assemble(input, mockCoachText(input), "mock");
  },
};
