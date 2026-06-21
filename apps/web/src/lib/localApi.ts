import type {
  AffordabilityResult,
  Alert,
  AlertTrigger,
  BuyerProfile,
  EmploymentType,
  GeoPoint,
  Listing,
  Offer,
  OfferDraft,
  SavedListing,
  ScoredListing,
  SortKey,
  User,
  VerificationTier,
  WatchSensitivity,
} from "@rep/shared";
import {
  buildMockCoach,
  buildSeed,
  buyerConfig,
  computeAffordability,
  computeAnchors,
  computeDealScore,
  computeSignals,
  computeTrueMonthlyCost,
  DISCLAIMER_VERSION,
  DISCLAIMERS,
  distanceKm,
  MARKET,
  marketConfig,
  sortListings,
  TARGET_BUYER,
  withinBox,
} from "@rep/shared";
import { getToken, setToken, ApiError } from "./http";
import type {
  ApiClient,
  GeocodeHit,
  ListingSearchInput,
  MetaResponse,
  ProfileInput,
  SearchItem,
} from "./apiTypes";
import type { VerificationTierInfo } from "./types";

/**
 * In-browser API for the static Vercel demo. Implements the same contract as the
 * HTTP client, backed by the bundled shared seed, the shared pure logic, and
 * localStorage. No server, no network: discovery, affordability, Deal Score, the
 * (mock) Coach, offers, save/watchdog all run client-side. Persistence is
 * per-browser via localStorage.
 */

let counter = 0;
const makeId = (prefix: string) => `${prefix}_${(++counter).toString(36)}`;
const newId = (prefix: string) =>
  `${prefix}_${(typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2))}`;

const SEED = buildSeed(makeId);

const TIER_LABELS: Record<Exclude<VerificationTier, 0>, string> = {
  1: marketConfig.tier1Label,
  2: "Verified agent / owner identity (ID + contact)",
  3: "In-person photo confirmation (geo/time-stamped)",
};

const JAMAICA_PLACES: GeocodeHit[] = [
  { region: "Kingston", label: "Kingston", center: { lng: -76.7936, lat: 18.0179 } },
  { region: "St. Andrew", label: "New Kingston, St. Andrew", center: { lng: -76.7869, lat: 18.0089 } },
  { region: "St. Andrew", label: "Liguanea, St. Andrew", center: { lng: -76.7669, lat: 18.0211 } },
  { region: "St. Andrew", label: "Stony Hill, St. Andrew", center: { lng: -76.7796, lat: 18.0712 } },
  { region: "St. Catherine", label: "Portmore, St. Catherine", center: { lng: -76.8794, lat: 17.9559 } },
  { region: "St. Catherine", label: "Spanish Town, St. Catherine", center: { lng: -76.9574, lat: 17.9913 } },
  { region: "St. James", label: "Montego Bay, St. James", center: { lng: -77.9186, lat: 18.4762 } },
  { region: "St. Ann", label: "Ocho Rios, St. Ann", center: { lng: -77.1031, lat: 18.4076 } },
  { region: "St. Ann", label: "Discovery Bay, St. Ann", center: { lng: -77.4039, lat: 18.4681 } },
  { region: "Manchester", label: "Mandeville, Manchester", center: { lng: -77.5075, lat: 18.042 } },
  { region: "Westmoreland", label: "Negril, Westmoreland", center: { lng: -78.347, lat: 18.2682 } },
  { region: "St. Thomas", label: "Yallahs, St. Thomas", center: { lng: -76.5611, lat: 17.8731 } },
];

// ── localStorage tables ──────────────────────────────────────────────────
interface DemoUser {
  id: string;
  email: string;
  name: string;
  password: string; // local demo only — never leaves the browser
}
function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function save<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

const K = {
  users: "demo.users",
  sessions: "demo.sessions",
  profiles: "demo.profiles",
  saved: "demo.saved",
  offers: "demo.offers",
  alerts: "demo.alerts",
} as const;

function currentUserId(): string | undefined {
  const token = getToken();
  if (!token) return undefined;
  return load<Record<string, string>>(K.sessions, {})[token];
}
function requireUserId(): string {
  const id = currentUserId();
  if (!id) throw new ApiError(401, "unauthorized");
  return id;
}

// ── Scoring helpers (mirror the server's services/listings) ───────────────
function scoreOne(listing: Listing, near?: GeoPoint): ScoredListing {
  const priceHistory = SEED.priceHistory.filter((p) => p.listingId === listing.id);
  const signals = computeSignals({ listing, priceHistory, comps: [], compsAvailable: false });
  return {
    ...listing,
    signals,
    dealScore: computeDealScore(signals),
    distanceKm: near ? Math.round(distanceKm(near, listing.geo) * 10) / 10 : undefined,
  };
}

function verificationBreakdown(listingId: string): VerificationTierInfo[] {
  const recs = SEED.verifications.filter((v) => v.listingId === listingId);
  return ([1, 2, 3] as const).map((tier) => {
    const rec = recs.find((r) => r.tier === tier);
    return {
      tier,
      label: TIER_LABELS[tier],
      achieved: Boolean(rec),
      method: rec?.method,
      verifiedAt: rec?.verifiedAt,
    };
  });
}

function profileFor(userId: string): BuyerProfile | undefined {
  const map = load<Record<string, ProfileInput & { id?: string; updatedAt?: string }>>(K.profiles, {});
  const p = map[userId];
  if (!p) return undefined;
  return {
    id: p.id ?? "bp_demo",
    userId,
    grossAnnualIncome: p.grossAnnualIncome,
    monthlyDebts: p.monthlyDebts,
    downPayment: p.downPayment,
    employmentType: p.employmentType as EmploymentType,
    dependents: p.dependents,
    updatedAt: p.updatedAt ?? new Date().toISOString(),
  };
}

const sleep = () => new Promise<void>((r) => setTimeout(r, 80)); // tiny delay so loading states show

export const localApi: ApiClient = {
  async meta(): Promise<MetaResponse> {
    return {
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
    };
  },

  async signup(email, password, name) {
    const users = load<Record<string, DemoUser>>(K.users, {});
    const key = email.toLowerCase();
    if (users[key]) throw new ApiError(409, "email_taken");
    const user: DemoUser = { id: newId("usr"), email: key, name, password };
    users[key] = user;
    save(K.users, users);
    const token = newId("sess");
    const sessions = load<Record<string, string>>(K.sessions, {});
    sessions[token] = user.id;
    save(K.sessions, sessions);
    return { token, user: { id: user.id, email: user.email, name: user.name } };
  },

  async login(email, password) {
    const users = load<Record<string, DemoUser>>(K.users, {});
    const u = users[email.toLowerCase()];
    if (!u || u.password !== password) throw new ApiError(401, "invalid_credentials");
    const token = newId("sess");
    const sessions = load<Record<string, string>>(K.sessions, {});
    sessions[token] = u.id;
    save(K.sessions, sessions);
    return { token, user: { id: u.id, email: u.email, name: u.name } };
  },

  async me() {
    const id = currentUserId();
    if (!id) return { user: null };
    const users = load<Record<string, DemoUser>>(K.users, {});
    const found = Object.values(users).find((u) => u.id === id);
    return { user: found ? { id: found.id, email: found.email, name: found.name } : null };
  },

  async logout() {
    const token = getToken();
    if (token) {
      const sessions = load<Record<string, string>>(K.sessions, {});
      delete sessions[token];
      save(K.sessions, sessions);
    }
    setToken(null);
    return { ok: true };
  },

  async reverseGeocode(lng, lat) {
    let best = JAMAICA_PLACES[0]!;
    let bestDist = Infinity;
    for (const place of JAMAICA_PLACES) {
      const d = distanceKm({ lng, lat }, place.center);
      if (d < bestDist) {
        bestDist = d;
        best = place;
      }
    }
    return { result: best };
  },

  async searchPlaces(q) {
    const query = q.trim().toLowerCase();
    if (!query) return { results: [] };
    return {
      results: JAMAICA_PLACES.filter(
        (p) => p.label.toLowerCase().includes(query) || p.region.toLowerCase().includes(query),
      ),
    };
  },

  async search(input: ListingSearchInput) {
    await sleep();
    const near = input.near;
    let items: SearchItem[] = SEED.listings
      .filter((l) => {
        if (l.status !== "active") return false;
        if (input.mode && l.mode !== input.mode) return false;
        if (input.bbox && !withinBox(l.geo, input.bbox)) return false;
        if (input.region && !l.region.toLowerCase().includes(input.region.toLowerCase())) return false;
        if (input.minPrice !== undefined && l.price < input.minPrice) return false;
        if (input.maxPrice !== undefined && l.price > input.maxPrice) return false;
        if (input.beds !== undefined && l.beds < input.beds) return false;
        if (input.baths !== undefined && l.baths < input.baths) return false;
        if (input.type && l.type !== input.type) return false;
        return true;
      })
      .map((l) => scoreOne(l, near));

    const userId = currentUserId();
    const profile = userId ? profileFor(userId) : undefined;
    let affordability: AffordabilityResult | undefined;
    if (profile) {
      affordability = computeAffordability(profile);
      items = items.map((item) => ({
        ...item,
        monthly: computeTrueMonthlyCost(item, profile, affordability!),
      }));
      if (input.affordableOnly) items = items.filter((i) => i.monthly?.withinBudget);
    }

    const sorted = sortListings(items, (input.sort as SortKey | undefined) ?? "recommended") as SearchItem[];
    return {
      listings: sorted,
      market: { hasComps: marketConfig.hasMls, region: marketConfig.regionNoun },
      affordability,
      affordableOnlyApplied: Boolean(profile && input.affordableOnly),
    };
  },

  async listing(id, near) {
    await sleep();
    const listing = SEED.listings.find((l) => l.id === id);
    if (!listing) throw new ApiError(404, "not_found");
    const scored = scoreOne(listing, near);
    const userId = currentUserId();
    const profile = userId ? profileFor(userId) : undefined;
    const monthly = profile
      ? computeTrueMonthlyCost(listing, profile, computeAffordability(profile))
      : undefined;
    const saved = userId
      ? load<SavedListing[]>(K.saved, []).find((s) => s.userId === userId && s.listingId === id)
      : undefined;
    return {
      listing: scored,
      anchors: computeAnchors(listing, scored.dealScore),
      verification: verificationBreakdown(id),
      priceHistory: SEED.priceHistory
        .filter((p) => p.listingId === id)
        .sort((a, b) => new Date(a.changedAt).getTime() - new Date(b.changedAt).getTime()),
      monthly,
      saved,
      market: { hasComps: marketConfig.hasMls, tier1Label: marketConfig.tier1Label },
    };
  },

  async report(id, reason, detail) {
    // No moderation backend in the static demo; acknowledge so the UX completes.
    void id;
    void reason;
    void detail;
    return { report: { ok: true } };
  },

  async getProfile() {
    const userId = requireUserId();
    const profile = profileFor(userId);
    return {
      profile: profile ?? null,
      affordability: profile ? computeAffordability(profile) : null,
    };
  },

  async saveProfile(input: ProfileInput) {
    const userId = requireUserId();
    const map = load<Record<string, ProfileInput & { id: string; updatedAt: string }>>(K.profiles, {});
    map[userId] = { ...input, id: map[userId]?.id ?? newId("bp"), updatedAt: new Date().toISOString() };
    save(K.profiles, map);
    const profile = profileFor(userId)!;
    return { profile, affordability: computeAffordability(profile) };
  },

  async coach(listingId) {
    await sleep();
    const listing = SEED.listings.find((l) => l.id === listingId);
    if (!listing) throw new ApiError(404, "not_found");
    const scored = scoreOne(listing);
    const anchors = computeAnchors(listing, scored.dealScore);
    const coach = buildMockCoach({ listing, signals: scored.signals, anchors });
    return { coach, dealScore: scored.dealScore, signals: scored.signals };
  },

  async createOffer(listingId, draft: OfferDraft) {
    const userId = requireUserId();
    if (!SEED.listings.some((l) => l.id === listingId)) throw new ApiError(404, "not_found");
    const offer: Offer = {
      id: newId("offer"),
      userId,
      listingId,
      draft,
      status: "draft",
      disclaimerVersion: DISCLAIMER_VERSION,
      createdAt: new Date().toISOString(),
    };
    const offers = load<Offer[]>(K.offers, []);
    offers.push(offer);
    save(K.offers, offers);
    return { offer };
  },

  async offers() {
    const userId = requireUserId();
    return { offers: load<Offer[]>(K.offers, []).filter((o) => o.userId === userId) };
  },

  async save(listingId, watchdogEnabled, sensitivity) {
    const userId = requireUserId();
    const all = load<SavedListing[]>(K.saved, []);
    const existing = all.find((s) => s.userId === userId && s.listingId === listingId);
    if (existing) {
      existing.watchdogEnabled = watchdogEnabled;
      existing.sensitivity = sensitivity;
      save(K.saved, all);
      return { saved: existing };
    }
    const saved: SavedListing = {
      id: newId("save"),
      userId,
      listingId,
      watchdogEnabled,
      sensitivity,
      createdAt: new Date().toISOString(),
    };
    all.push(saved);
    save(K.saved, all);
    return { saved };
  },

  async saved() {
    const userId = requireUserId();
    const items = load<SavedListing[]>(K.saved, [])
      .filter((s) => s.userId === userId)
      .map((s) => {
        const listing = SEED.listings.find((l) => l.id === s.listingId);
        return listing ? { saved: s, listing: scoreOne(listing) } : null;
      })
      .filter((x): x is { saved: SavedListing; listing: ScoredListing } => x !== null);
    return { items };
  },

  async unsave(listingId) {
    const userId = requireUserId();
    const all = load<SavedListing[]>(K.saved, []).filter(
      (s) => !(s.userId === userId && s.listingId === listingId),
    );
    save(K.saved, all);
    return { ok: true };
  },

  async alerts() {
    const userId = requireUserId();
    return {
      alerts: load<Alert[]>(K.alerts, [])
        .filter((a) => a.userId === userId)
        .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime()),
    };
  },

  async markAlertRead(id) {
    const userId = requireUserId();
    const all = load<Alert[]>(K.alerts, []);
    const a = all.find((x) => x.id === id && x.userId === userId);
    if (a) a.readAt = new Date().toISOString();
    save(K.alerts, all);
    return { ok: true };
  },

  async checkWatchdog() {
    const userId = requireUserId();
    const DOM_THRESHOLD: Record<WatchSensitivity, number> = { passive: 150, balanced: 90, aggressive: 45 };
    const alerts = load<Alert[]>(K.alerts, []);
    const has = (listingId: string, trigger: AlertTrigger) =>
      alerts.some((a) => a.userId === userId && a.listingId === listingId && a.trigger === trigger);
    const add = (listingId: string, trigger: AlertTrigger, message: string) => {
      alerts.push({ id: newId("alert"), userId, listingId, trigger, message, sentAt: new Date().toISOString() });
      created++;
    };

    let created = 0;
    const saved = load<SavedListing[]>(K.saved, []).filter((s) => s.userId === userId && s.watchdogEnabled);
    for (const s of saved) {
      const listing = SEED.listings.find((l) => l.id === s.listingId);
      if (!listing) continue;
      const { signals } = scoreOne(listing);
      if (signals.priceCutCount > 0 && !has(s.listingId, "new_price_cut")) {
        add(
          s.listingId,
          "new_price_cut",
          `${listing.title} has dropped ${(signals.totalPriceCutPct * 100).toFixed(0)}% from its first list price. The data says take a look.`,
        );
      }
      if (signals.daysOnMarket >= DOM_THRESHOLD[s.sensitivity] && !has(s.listingId, "crossed_days_on_market")) {
        add(
          s.listingId,
          "crossed_days_on_market",
          `${listing.title} has now sat ${signals.daysOnMarket} days — sellers get more flexible the longer a place lingers.`,
        );
      }
    }
    save(K.alerts, alerts);
    return {
      created,
      alerts: alerts.filter((a) => a.userId === userId).sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime()),
    };
  },
};
