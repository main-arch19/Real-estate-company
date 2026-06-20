import { Hono } from "hono";
import {
  buyerConfig,
  DISCLAIMER_VERSION,
  DISCLAIMERS,
  MARKET,
  marketConfig,
  TARGET_BUYER,
} from "@rep/shared";
import { store } from "../store/memory.js";
import { type AppEnv, requireAuth } from "../auth/middleware.js";

export const metaRoutes = new Hono<AppEnv>();

/** Client bootstrap: drives copy emphasis, tabs, currency, fees, disclaimers. */
metaRoutes.get("/", (c) => {
  return c.json({
    targetBuyer: TARGET_BUYER,
    market: MARKET,
    buyer: buyerConfig,
    marketConfig: {
      currency: marketConfig.currency,
      currencySymbol: marketConfig.currencySymbol,
      locale: marketConfig.locale,
      hasMls: marketConfig.hasMls,
      tier1Label: marketConfig.tier1Label,
      defaultCenter: marketConfig.defaultCenter,
      defaultZoom: marketConfig.defaultZoom,
      regionNoun: marketConfig.regionNoun,
      closingFees: marketConfig.closingFees,
      rateTable: marketConfig.rateTable,
      scamTopics: marketConfig.scamTopics,
    },
    disclaimers: DISCLAIMERS,
    disclaimerVersion: DISCLAIMER_VERSION,
  });
});

/** Moderation queue (open reports). Auth-gated; in production this is admin-only. */
metaRoutes.get("/reports", requireAuth, (c) => {
  return c.json({ reports: store.allReports() });
});
