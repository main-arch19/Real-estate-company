import type { Context, Next } from "hono";
import { store } from "../store/memory.js";

export interface AppEnv {
  Variables: { userId: string };
}

/** Extract the bearer token from the Authorization header. */
export function tokenFrom(c: Context): string | undefined {
  const header = c.req.header("Authorization");
  if (!header?.startsWith("Bearer ")) return undefined;
  return header.slice("Bearer ".length).trim();
}

/** Require a valid session; sets `userId` on the context. */
export async function requireAuth(c: Context<AppEnv>, next: Next): Promise<Response | void> {
  const token = tokenFrom(c);
  const userId = token ? store.userIdForToken(token) : undefined;
  if (!userId) return c.json({ error: "unauthorized" }, 401);
  c.set("userId", userId);
  await next();
}
