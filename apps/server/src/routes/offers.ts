import { Hono } from "hono";
import { DISCLAIMER_VERSION, offerDraftSchema } from "@rep/shared";
import { providers } from "../providers/index.js";
import { store } from "../store/memory.js";
import { type AppEnv, requireAuth } from "../auth/middleware.js";

export const offerRoutes = new Hono<AppEnv>();

offerRoutes.use("*", requireAuth);

/**
 * Create a DRAFT offer. Drafts can never be "submitted" in-app — only exported.
 * The disclaimer version shown at export time is recorded for compliance.
 */
offerRoutes.post("/", async (c) => {
  const body = await c.req.json().catch(() => null);
  const listingId = (body as { listingId?: string })?.listingId;
  const parsed = offerDraftSchema.safeParse((body as { draft?: unknown })?.draft);
  if (!listingId || !parsed.success) return c.json({ error: "invalid_input" }, 400);
  if (!providers.listing.byId(listingId)) return c.json({ error: "not_found" }, 404);

  const offer = store.createOffer(c.get("userId"), listingId, parsed.data, DISCLAIMER_VERSION);
  return c.json({ offer });
});

offerRoutes.get("/", (c) => {
  return c.json({ offers: store.offersForUser(c.get("userId")) });
});
