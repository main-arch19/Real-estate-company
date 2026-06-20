import { Hono } from "hono";
import type { OfferDraft } from "@rep/shared";
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

  // Build a concretely-typed OfferDraft from the validated data. The `?? `
  // fallbacks make this compile regardless of how Zod's output infers
  // optionality across TS/zod versions; validation guarantees presence at runtime.
  const d = parsed.data;
  const draft: OfferDraft = {
    offerPrice: d.offerPrice ?? 0,
    depositPercent: d.depositPercent ?? 0,
    conditions: d.conditions ?? [],
    closingTimelineDays: d.closingTimelineDays ?? 0,
    inclusions: d.inclusions ?? [],
    notes: d.notes ?? "",
  };
  const offer = store.createOffer(c.get("userId"), listingId, draft, DISCLAIMER_VERSION);
  return c.json({ offer });
});

offerRoutes.get("/", (c) => {
  return c.json({ offers: store.offersForUser(c.get("userId")) });
});
