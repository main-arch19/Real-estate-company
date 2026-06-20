import { Hono } from "hono";
import type { GeoPoint, ScoredListing, TrueMonthlyCost } from "@rep/shared";
import {
  computeAffordability,
  computeTrueMonthlyCost,
  listingQuerySchema,
  marketConfig,
  reportListingSchema,
  sortListings,
  type SortKey,
} from "@rep/shared";
import { providers } from "../providers/index.js";
import { store } from "../store/memory.js";
import { computeAnchors, scoreListing, scoreMany } from "../services/listings.js";
import { type AppEnv, tokenFrom } from "../auth/middleware.js";

export const listingRoutes = new Hono<AppEnv>();

function optionalUserId(c: { req: { header: (k: string) => string | undefined } }): string | undefined {
  const header = c.req.header("Authorization");
  if (!header?.startsWith("Bearer ")) return undefined;
  return store.userIdForToken(header.slice(7).trim());
}

interface SearchItem extends ScoredListing {
  monthly?: TrueMonthlyCost;
}

listingRoutes.post("/search", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const parsed = listingQuerySchema.safeParse(body);
  if (!parsed.success) return c.json({ error: "invalid_query", issues: parsed.error.issues }, 400);

  const near = body.near as GeoPoint | undefined;
  const sort = (body.sort as SortKey | undefined) ?? "recommended";

  const raw = providers.listing.query(parsed.data);
  let items: SearchItem[] = scoreMany(raw, near);

  // Affordability enrichment when the user is signed in with a profile.
  const userId = optionalUserId(c);
  const profile = userId ? store.getProfile(userId) : undefined;
  let affordability: ReturnType<typeof computeAffordability> | undefined;
  if (profile) {
    affordability = computeAffordability(profile);
    items = items.map((item) => ({
      ...item,
      monthly: computeTrueMonthlyCost(item, profile, affordability!),
    }));
    if (parsed.data.affordableOnly) {
      items = items.filter((i) => i.monthly?.withinBudget);
    }
  }

  const sorted = sortListings(items, sort) as SearchItem[];

  return c.json({
    listings: sorted,
    market: { hasComps: marketConfig.hasMls, region: marketConfig.regionNoun },
    affordability,
    affordableOnlyApplied: Boolean(profile && parsed.data.affordableOnly),
  });
});

listingRoutes.get("/:id", (c) => {
  const id = c.req.param("id");
  const listing = providers.listing.byId(id);
  if (!listing) return c.json({ error: "not_found" }, 404);

  const lng = c.req.query("lng");
  const lat = c.req.query("lat");
  const near = lng && lat ? { lng: Number(lng), lat: Number(lat) } : undefined;

  const scored = scoreListing(listing, near);
  const anchors = computeAnchors(listing, scored.dealScore);
  const verification = providers.verification.breakdown(id);
  const priceHistory = store
    .priceHistoryFor(id)
    .sort((a, b) => new Date(a.changedAt).getTime() - new Date(b.changedAt).getTime());

  const userId = optionalUserId(c);
  const profile = userId ? store.getProfile(userId) : undefined;
  const monthly =
    profile != null
      ? computeTrueMonthlyCost(listing, profile, computeAffordability(profile))
      : undefined;
  const saved = userId
    ? store.savedForUser(userId).find((s) => s.listingId === id)
    : undefined;

  return c.json({
    listing: scored,
    anchors,
    verification,
    priceHistory,
    monthly,
    saved,
    market: { hasComps: marketConfig.hasMls, tier1Label: providers.verification.tier1Label },
  });
});

listingRoutes.post("/:id/report", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = reportListingSchema.safeParse({ ...body, listingId: c.req.param("id") });
  if (!parsed.success) return c.json({ error: "invalid_input" }, 400);
  if (!providers.listing.byId(parsed.data.listingId)) return c.json({ error: "not_found" }, 404);
  const report = store.createReport(
    parsed.data.listingId,
    parsed.data.reason,
    parsed.data.detail,
    optionalUserId(c),
  );
  return c.json({ report });
});
