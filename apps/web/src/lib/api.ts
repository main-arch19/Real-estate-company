import type {
  AffordabilityResult,
  Alert,
  BuyerProfile,
  CoachRead,
  DealScore,
  ListingSignals,
  Offer,
  OfferDraft,
  PriceChange,
  SavedListing,
  ScoredListing,
  TrueMonthlyCost,
  User,
  WatchSensitivity,
} from "@rep/shared";
import type { VerificationTierInfo } from "./types";

const BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8787";

const TOKEN_KEY = "rep.token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new ApiError(res.status, body.error ?? `HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export interface SearchItem extends ScoredListing {
  monthly?: TrueMonthlyCost;
}
export interface SearchResponse {
  listings: SearchItem[];
  market: { hasComps: boolean; region: string };
  affordability?: AffordabilityResult;
  affordableOnlyApplied: boolean;
}

export interface ListingDetail {
  listing: ScoredListing;
  anchors: { open: number; target: number; walk: number };
  verification: VerificationTierInfo[];
  priceHistory: PriceChange[];
  monthly?: TrueMonthlyCost;
  saved?: SavedListing;
  market: { hasComps: boolean; tier1Label: string };
}

export interface CoachResponse {
  coach: CoachRead;
  dealScore: DealScore;
  signals: ListingSignals;
}

export interface MetaResponse {
  targetBuyer: string;
  market: string;
  buyer: { modeTabs: string[]; lead: string; coachTone: string; showInvestorMetrics: boolean };
  marketConfig: {
    currency: string;
    currencySymbol: string;
    locale: string;
    hasMls: boolean;
    tier1Label: string;
    defaultCenter: [number, number];
    defaultZoom: number;
    regionNoun: string;
    closingFees: { label: string; rate: number }[];
    rateTable: { termYears: number; annualRate: number }[];
    scamTopics: string[];
  };
  disclaimers: Record<string, string>;
  disclaimerVersion: string;
}

export interface ListingSearchInput {
  bbox?: { minLng: number; minLat: number; maxLng: number; maxLat: number };
  near?: { lng: number; lat: number };
  region?: string;
  mode?: "buy" | "rent";
  minPrice?: number;
  maxPrice?: number;
  beds?: number;
  baths?: number;
  type?: string;
  affordableOnly?: boolean;
  sort?: string;
}

export const api = {
  meta: () => request<MetaResponse>("/api/meta"),

  // auth
  signup: (email: string, password: string, name: string) =>
    request<{ token: string; user: User }>("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({ email, password, name }),
    }),
  login: (email: string, password: string) =>
    request<{ token: string; user: User }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  me: () => request<{ user: User | null }>("/api/auth/me"),
  logout: () => request<{ ok: true }>("/api/auth/logout", { method: "POST" }),

  // geo
  reverseGeocode: (lng: number, lat: number) =>
    request<{ result: { region: string; label: string; center: { lng: number; lat: number } } }>(
      `/api/geo/reverse?lng=${lng}&lat=${lat}`,
    ),
  searchPlaces: (q: string) =>
    request<{ results: { region: string; label: string; center: { lng: number; lat: number } }[] }>(
      `/api/geo/search?q=${encodeURIComponent(q)}`,
    ),

  // listings
  search: (input: ListingSearchInput) =>
    request<SearchResponse>("/api/listings/search", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  listing: (id: string, near?: { lng: number; lat: number }) =>
    request<ListingDetail>(
      `/api/listings/${id}${near ? `?lng=${near.lng}&lat=${near.lat}` : ""}`,
    ),
  report: (id: string, reason: string, detail?: string) =>
    request<{ report: unknown }>(`/api/listings/${id}/report`, {
      method: "POST",
      body: JSON.stringify({ reason, detail }),
    }),

  // profile / affordability
  getProfile: () =>
    request<{ profile: BuyerProfile | null; affordability: AffordabilityResult | null }>(
      "/api/profile",
    ),
  saveProfile: (input: {
    grossAnnualIncome: number;
    monthlyDebts: number;
    downPayment: number;
    employmentType: string;
    dependents?: number;
  }) =>
    request<{ profile: BuyerProfile; affordability: AffordabilityResult }>("/api/profile", {
      method: "PUT",
      body: JSON.stringify(input),
    }),

  // coach
  coach: (listingId: string) =>
    request<CoachResponse>("/api/coach", {
      method: "POST",
      body: JSON.stringify({ listingId }),
    }),

  // offers
  createOffer: (listingId: string, draft: OfferDraft) =>
    request<{ offer: Offer }>("/api/offers", {
      method: "POST",
      body: JSON.stringify({ listingId, draft }),
    }),
  offers: () => request<{ offers: Offer[] }>("/api/offers"),

  // saved / watchdog
  save: (listingId: string, watchdogEnabled: boolean, sensitivity: WatchSensitivity) =>
    request<{ saved: SavedListing }>("/api/saved", {
      method: "POST",
      body: JSON.stringify({ listingId, watchdogEnabled, sensitivity }),
    }),
  saved: () =>
    request<{ items: { saved: SavedListing; listing: ScoredListing }[] }>("/api/saved"),
  unsave: (listingId: string) =>
    request<{ ok: true }>(`/api/saved/${listingId}`, { method: "DELETE" }),

  // alerts
  alerts: () => request<{ alerts: Alert[] }>("/api/alerts"),
  markAlertRead: (id: string) =>
    request<{ ok: true }>(`/api/alerts/${id}/read`, { method: "POST" }),
  checkWatchdog: () =>
    request<{ created: number; alerts: Alert[] }>("/api/alerts/check", { method: "POST" }),
};
