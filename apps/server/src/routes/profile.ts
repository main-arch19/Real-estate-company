import { Hono } from "hono";
import { buyerProfileInputSchema, computeAffordability } from "@rep/shared";
import { store } from "../store/memory.js";
import { type AppEnv, requireAuth } from "../auth/middleware.js";

export const profileRoutes = new Hono<AppEnv>();

profileRoutes.use("*", requireAuth);

profileRoutes.get("/", (c) => {
  const profile = store.getProfile(c.get("userId"));
  if (!profile) return c.json({ profile: null, affordability: null });
  return c.json({ profile, affordability: computeAffordability(profile) });
});

profileRoutes.put("/", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = buyerProfileInputSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: "invalid_input", issues: parsed.error.issues }, 400);
  const profile = store.upsertProfile(c.get("userId"), parsed.data);
  return c.json({ profile, affordability: computeAffordability(profile) });
});
