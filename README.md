# Strikepoint — Real Estate Discovery & Offer Platform

A property-discovery app that flips the model from *"browse then despair"* to *"see your real
options, know when to strike, and don't get scammed."* Built for **first-time buyers** in a
**Jamaica** (no-MLS) market — re-targetable via two config flags.

Four pillars:
1. **Map-first discovery** — listings near you on a split list + map.
2. **AI Negotiation Coach + Offer Drafter + Watchdog** — reads market signals, suggests strategy,
   drafts terms, and pings you when the data says strike.
3. **Affordability reverse-engineering** — income/debt/down-payment in → real affordable inventory +
   true monthly cost out.
4. **Scam-Shield** — tiered verification, a Trust Badge, and verified-first ranking.

## Quick start (zero external setup)

```bash
npm install
npm run dev
```

- Web: <http://localhost:5173>
- API: <http://localhost:8787>

The app runs **fully on the mock-first stack** — an in-memory seeded store, mock auth, and a
deterministic Negotiation Coach. No accounts, keys, or tokens required. The map uses free
OpenStreetMap tiles (no token).

### Optional integrations (`.env` — copy from `.env.example`)

| Variable | Effect when set |
|---|---|
| `ANTHROPIC_API_KEY` | Negotiation Coach uses **Claude (`claude-opus-4-8`)** instead of the deterministic mock. Server-side only. |
| `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` | Swaps the mock store for Supabase (schema in `supabase/schema.sql`). |
| `TARGET_BUYER` | `first_time_buyer` (default) · `investor` · `luxury` · `rental` |
| `MARKET` | `jamaica` (default) · `caribbean` · `us` · `generic` |

## Architecture

```
packages/shared   Domain types, Zod schemas, Deal Score scorer, affordability math,
                  signals, versioned disclaimers, config (the re-targeting flags).
apps/server       Hono API. Provider interfaces (the MARKET swap seam), mock store +
                  encrypted profiles, AI provider (Claude + mock fallback), watchdog cron.
apps/web          React + Vite + Tailwind + TanStack Query + MapLibre GL.
supabase/         Production-shaped Postgres schema + RLS (inactive until keys are set).
```

### The two flags change the build

`MARKET=jamaica` means **no MLS** → comps are unavailable, so the Deal Score and Coach degrade
honestly to days-on-market + price-cut signals (never a fabricated comp). Rates come from a
configurable local rate table; verification tier 1 = *title/registration reference*; stamp duty +
closing costs are surfaced separately; scam education leads on capture/squatter land + double-selling.
Everything market-specific lives in `packages/shared/src/config.ts` and the `apps/server/src/providers/`
layer — switching `MARKET` swaps data sources without touching UI.

### How the AI stays responsible

- Runs **server-side only**; the key never reaches the browser.
- The offer-band **numbers** (open/target/walk) are computed server-side from observed signals; the
  model only writes the *reasoning* — it never invents prices.
- Every Coach/affordability/offer output carries a persistent, non-dismissable "estimates, not advice"
  disclaimer. Drafts can be **exported** (print to PDF) but never submitted in-app. The disclaimer
  version shown at export is stored with the offer.

## Verify

```bash
npm run typecheck   # shared + server + web, no `any`
npm run build       # production web build
npm run dev         # then walk the flow below
```

End-to-end flow: land → "Use my current location" → split map of verified-ranked homes → set your
budget → flip **Affordable-fit** → open a listing for the leverage read + offer band → export a draft
→ save with the watchdog armed → get pinged when a price cut crosses your threshold.

> The watchdog normally runs every 15 minutes. For a live demo, open **Saved & Watchdog** and click
> **"Check signals now"**. A mock-only `POST /api/dev/price-cut` endpoint can inject a post-save cut.
