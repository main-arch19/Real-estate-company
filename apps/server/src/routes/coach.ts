import { Hono } from "hono";
import { coachRequestSchema } from "@rep/shared";
import { providers } from "../providers/index.js";
import { computeAnchors, scoreListing } from "../services/listings.js";
import type { AppEnv } from "../auth/middleware.js";

export const coachRoutes = new Hono<AppEnv>();

/**
 * Negotiation Coach. Public (a buyer tool on the listing detail). The AI sees
 * only computed signals + server-derived anchors and never invents numbers; if
 * comps are unavailable the Coach says so.
 */
coachRoutes.post("/", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = coachRequestSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: "invalid_input" }, 400);

  const listing = providers.listing.byId(parsed.data.listingId);
  if (!listing) return c.json({ error: "not_found" }, 404);

  const scored = scoreListing(listing);
  const anchors = computeAnchors(listing, scored.dealScore);
  const read = await providers.ai.coach({ listing, signals: scored.signals, anchors });

  return c.json({ coach: read, dealScore: scored.dealScore, signals: scored.signals });
});
