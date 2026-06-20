import { Hono } from "hono";
import { saveListingSchema } from "@rep/shared";
import { providers } from "../providers/index.js";
import { store } from "../store/memory.js";
import { scoreListing } from "../services/listings.js";
import { type AppEnv, requireAuth } from "../auth/middleware.js";

export const savedRoutes = new Hono<AppEnv>();

savedRoutes.use("*", requireAuth);

savedRoutes.post("/", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = saveListingSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: "invalid_input" }, 400);
  if (!providers.listing.byId(parsed.data.listingId)) return c.json({ error: "not_found" }, 404);
  const saved = store.saveListing(
    c.get("userId"),
    parsed.data.listingId,
    parsed.data.watchdogEnabled,
    parsed.data.sensitivity,
  );
  return c.json({ saved });
});

savedRoutes.get("/", (c) => {
  const saved = store.savedForUser(c.get("userId"));
  const items = saved
    .map((s) => {
      const listing = providers.listing.byId(s.listingId);
      if (!listing) return null;
      return { saved: s, listing: scoreListing(listing) };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
  return c.json({ items });
});

savedRoutes.delete("/:listingId", (c) => {
  store.removeSaved(c.get("userId"), c.req.param("listingId"));
  return c.json({ ok: true });
});
