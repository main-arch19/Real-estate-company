import { Hono } from "hono";
import { loginSchema, signupSchema } from "@rep/shared";
import { store } from "../store/memory.js";
import { type AppEnv, requireAuth, tokenFrom } from "../auth/middleware.js";

export const authRoutes = new Hono<AppEnv>();

authRoutes.post("/signup", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: "invalid_input", issues: parsed.error.issues }, 400);
  try {
    const user = store.createUser(parsed.data.email, parsed.data.password, parsed.data.name);
    const token = store.createSession(user.id);
    return c.json({ token, user });
  } catch (err) {
    if (err instanceof Error && err.message === "email_taken") {
      return c.json({ error: "email_taken" }, 409);
    }
    throw err;
  }
});

authRoutes.post("/login", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: "invalid_input" }, 400);
  const user = store.authenticate(parsed.data.email, parsed.data.password);
  if (!user) return c.json({ error: "invalid_credentials" }, 401);
  const token = store.createSession(user.id);
  return c.json({ token, user });
});

authRoutes.post("/logout", async (c) => {
  const token = tokenFrom(c);
  if (token) store.destroySession(token);
  return c.json({ ok: true });
});

authRoutes.get("/me", requireAuth, (c) => {
  const user = store.userById(c.get("userId"));
  return c.json({ user });
});
