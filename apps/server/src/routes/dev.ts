import { Hono } from "hono";
import { providers } from "../providers/index.js";
import { store } from "../store/memory.js";
import type { AppEnv } from "../auth/middleware.js";

/**
 * Mock-only testing aids. Mounted ONLY when running on the in-memory backend
 * (never with Supabase). Lets you simulate a post-save price cut so the
 * watchdog's price-cut alert can be demonstrated end-to-end.
 */
export const devRoutes = new Hono<AppEnv>();

devRoutes.post("/price-cut", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as { listingId?: string; newPrice?: number };
  if (!body.listingId || typeof body.newPrice !== "number") {
    return c.json({ error: "invalid_input" }, 400);
  }
  const listing = providers.listing.byId(body.listingId);
  if (!listing) return c.json({ error: "not_found" }, 404);
  store.applyPriceChange(body.listingId, body.newPrice);
  return c.json({ ok: true, listingId: body.listingId, price: body.newPrice });
});
