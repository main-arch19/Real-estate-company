import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { MARKET, TARGET_BUYER } from "@rep/shared";
import { env, hasAnthropic, hasSupabase } from "./env.js";
import type { AppEnv } from "./auth/middleware.js";
import { authRoutes } from "./routes/auth.js";
import { listingRoutes } from "./routes/listings.js";
import { profileRoutes } from "./routes/profile.js";
import { coachRoutes } from "./routes/coach.js";
import { offerRoutes } from "./routes/offers.js";
import { savedRoutes } from "./routes/saved.js";
import { alertRoutes } from "./routes/alerts.js";
import { geoRoutes } from "./routes/geo.js";
import { metaRoutes } from "./routes/meta.js";
import { devRoutes } from "./routes/dev.js";
import { startWatchdog } from "./watchdog/index.js";

const app = new Hono<AppEnv>();

app.use("*", cors());

app.get("/health", (c) =>
  c.json({
    ok: true,
    market: MARKET,
    targetBuyer: TARGET_BUYER,
    ai: hasAnthropic ? "claude" : "mock",
    backend: hasSupabase ? "supabase" : "mock",
  }),
);

app.route("/api/auth", authRoutes);
app.route("/api/meta", metaRoutes);
app.route("/api/geo", geoRoutes);
app.route("/api/listings", listingRoutes);
app.route("/api/profile", profileRoutes);
app.route("/api/coach", coachRoutes);
app.route("/api/offers", offerRoutes);
app.route("/api/saved", savedRoutes);
app.route("/api/alerts", alertRoutes);

// Mock-only testing aids (never mounted with a real backend).
if (!hasSupabase) app.route("/api/dev", devRoutes);

startWatchdog();

serve({ fetch: app.fetch, port: env.port }, (info) => {
  console.log(
    `[server] listening on http://localhost:${info.port}  ` +
      `(market=${MARKET}, buyer=${TARGET_BUYER}, ai=${hasAnthropic ? "claude" : "mock"})`,
  );
});
