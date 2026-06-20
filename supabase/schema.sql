-- ───────────────────────────────────────────────────────────────────────────
-- Real Estate Discovery & Offer Platform — Postgres schema (Supabase)
--
-- INACTIVE until SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set. The mock
-- in-memory store mirrors these shapes 1:1. RLS is enabled on every
-- user-scoped table; sensitive buyer_profile columns are encrypted with
-- pgcrypto (the mock store uses AES-GCM instead).
-- ───────────────────────────────────────────────────────────────────────────

create extension if not exists postgis;
create extension if not exists pgcrypto;

-- Listings ───────────────────────────────────────────────────────────────────
create table if not exists listings (
  id                 uuid primary key default gen_random_uuid(),
  title              text not null,
  address            text not null,
  region             text not null,           -- parish / county
  geo                geography(point, 4326) not null,
  price              numeric not null,
  mode               text not null default 'buy',  -- buy | rent
  beds               int not null default 0,
  baths              int not null default 0,
  area_sqft          int,
  type               text not null,           -- house|apartment|townhouse|land|commercial
  status             text not null default 'active',
  listed_at          timestamptz not null default now(),
  images             text[] not null default '{}',
  description        text not null default '',
  strata_monthly     numeric,
  owner_id           uuid,
  verification_tier  int not null default 0,
  deal_score         int                       -- denormalized cache (recomputed server-side)
);
create index if not exists listings_geo_idx on listings using gist (geo);
create index if not exists listings_price_idx on listings (price);

create table if not exists price_history (
  id          uuid primary key default gen_random_uuid(),
  listing_id  uuid not null references listings(id) on delete cascade,
  price       numeric not null,
  changed_at  timestamptz not null default now()
);

-- comps are nullable by market (no rows in no-MLS markets like jamaica)
create table if not exists comps (
  id          uuid primary key default gen_random_uuid(),
  listing_id  uuid not null references listings(id) on delete cascade,
  comp_price  numeric not null,
  sold_at     timestamptz not null,
  source      text not null,
  confidence  numeric not null default 0.5
);

create table if not exists verifications (
  id            uuid primary key default gen_random_uuid(),
  listing_id    uuid not null references listings(id) on delete cascade,
  tier          int not null,
  method        text not null,
  evidence_url  text,
  verified_by   text,
  verified_at   timestamptz not null default now()
);

create table if not exists listing_reports (
  id           uuid primary key default gen_random_uuid(),
  listing_id   uuid not null references listings(id) on delete cascade,
  reason       text not null,
  detail       text,
  reported_by  uuid,
  status       text not null default 'open',
  created_at   timestamptz not null default now()
);

-- Buyer profiles — sensitive columns encrypted with pgcrypto ─────────────────
-- Stored as bytea via pgp_sym_encrypt(value::text, current_setting('app.enc_key')).
create table if not exists buyer_profiles (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null unique references auth.users(id) on delete cascade,
  gross_income_enc    bytea not null,
  monthly_debts_enc   bytea not null,
  down_payment_enc    bytea not null,
  employment_type     text not null,
  dependents          int,
  updated_at          timestamptz not null default now()
);

create table if not exists saved_listings (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  listing_id        uuid not null references listings(id) on delete cascade,
  watchdog_enabled  boolean not null default false,
  sensitivity       text not null default 'balanced',
  last_signal_at    timestamptz,
  created_at        timestamptz not null default now(),
  unique (user_id, listing_id)
);

create table if not exists offers (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  listing_id          uuid not null references listings(id) on delete cascade,
  draft_json          jsonb not null,
  status              text not null default 'draft',
  disclaimer_version  text not null,
  created_at          timestamptz not null default now()
);

create table if not exists alerts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  listing_id  uuid not null references listings(id) on delete cascade,
  trigger     text not null,
  message     text not null,
  sent_at     timestamptz not null default now(),
  read_at     timestamptz
);

-- Row-Level Security ─────────────────────────────────────────────────────────
alter table buyer_profiles enable row level security;
alter table saved_listings enable row level security;
alter table offers enable row level security;
alter table alerts enable row level security;

create policy "own profile" on buyer_profiles
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own saved" on saved_listings
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own offers" on offers
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own alerts" on alerts
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Listings, price_history, comps, verifications are publicly readable.
alter table listings enable row level security;
create policy "listings readable" on listings for select using (true);
alter table price_history enable row level security;
create policy "price_history readable" on price_history for select using (true);
alter table verifications enable row level security;
create policy "verifications readable" on verifications for select using (true);
