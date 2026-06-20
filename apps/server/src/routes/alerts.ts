import { Hono } from "hono";
import { store } from "../store/memory.js";
import { runWatchdogForUser } from "../watchdog/index.js";
import { type AppEnv, requireAuth } from "../auth/middleware.js";

export const alertRoutes = new Hono<AppEnv>();

alertRoutes.use("*", requireAuth);

alertRoutes.get("/", (c) => {
  return c.json({ alerts: store.alertsForUser(c.get("userId")) });
});

alertRoutes.post("/:id/read", (c) => {
  store.markAlertRead(c.get("userId"), c.req.param("id"));
  return c.json({ ok: true });
});

/** Manually trigger the watchdog for the current user (demo/testing aid). */
alertRoutes.post("/check", (c) => {
  const created = runWatchdogForUser(c.get("userId"));
  return c.json({ created, alerts: store.alertsForUser(c.get("userId")) });
});
