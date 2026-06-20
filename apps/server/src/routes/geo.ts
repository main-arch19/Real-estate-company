import { Hono } from "hono";
import { providers } from "../providers/index.js";
import type { AppEnv } from "../auth/middleware.js";

export const geoRoutes = new Hono<AppEnv>();

geoRoutes.get("/reverse", (c) => {
  const lng = Number(c.req.query("lng"));
  const lat = Number(c.req.query("lat"));
  if (Number.isNaN(lng) || Number.isNaN(lat)) return c.json({ error: "invalid_coords" }, 400);
  return c.json({ result: providers.geocode.reverse({ lng, lat }) });
});

geoRoutes.get("/search", (c) => {
  const q = c.req.query("q") ?? "";
  return c.json({ results: providers.geocode.search(q) });
});
