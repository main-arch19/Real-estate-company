import type {
  AffordabilityResult,
  Alert,
  BuyerProfile,
  Offer,
  OfferDraft,
  SavedListing,
  ScoredListing,
  User,
  WatchSensitivity,
} from "@rep/shared";
import { ApiError, getToken, setToken } from "./http";
import { localApi } from "./localApi";
import type {
  ApiClient,
  CoachResponse,
  GeocodeHit,
  ListingDetail,
  ListingSearchInput,
  MetaResponse,
  ProfileInput,
  SearchResponse,
} from "./apiTypes";

type BuyerProfileResult = BuyerProfile | null;

const BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8787";

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

/** HTTP client — used in local dev against the Hono server. */
const httpApi: ApiClient = {
  meta: () => request<MetaResponse>("/api/meta"),

  signup: (email, password, name) =>
    request<{ token: string; user: User }>("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({ email, password, name }),
    }),
  login: (email, password) =>
    request<{ token: string; user: User }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  me: () => request<{ user: User | null }>("/api/auth/me"),
  logout: () => request<{ ok: true }>("/api/auth/logout", { method: "POST" }),

  reverseGeocode: (lng, lat) =>
    request<{ result: GeocodeHit }>(`/api/geo/reverse?lng=${lng}&lat=${lat}`),
  searchPlaces: (q) =>
    request<{ results: GeocodeHit[] }>(`/api/geo/search?q=${encodeURIComponent(q)}`),

  search: (input: ListingSearchInput) =>
    request<SearchResponse>("/api/listings/search", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  listing: (id, near) =>
    request<ListingDetail>(`/api/listings/${id}${near ? `?lng=${near.lng}&lat=${near.lat}` : ""}`),
  report: (id, reason, detail) =>
    request<{ report: unknown }>(`/api/listings/${id}/report`, {
      method: "POST",
      body: JSON.stringify({ reason, detail }),
    }),

  getProfile: () =>
    request<{ profile: BuyerProfileResult; affordability: AffordabilityResult | null }>("/api/profile"),
  saveProfile: (input: ProfileInput) =>
    request<{ profile: BuyerProfile; affordability: AffordabilityResult }>("/api/profile", {
      method: "PUT",
      body: JSON.stringify(input),
    }),

  coach: (listingId) =>
    request<CoachResponse>("/api/coach", {
      method: "POST",
      body: JSON.stringify({ listingId }),
    }),

  createOffer: (listingId, draft: OfferDraft) =>
    request<{ offer: Offer }>("/api/offers", {
      method: "POST",
      body: JSON.stringify({ listingId, draft }),
    }),
  offers: () => request<{ offers: Offer[] }>("/api/offers"),

  save: (listingId, watchdogEnabled, sensitivity: WatchSensitivity) =>
    request<{ saved: SavedListing }>("/api/saved", {
      method: "POST",
      body: JSON.stringify({ listingId, watchdogEnabled, sensitivity }),
    }),
  saved: () =>
    request<{ items: { saved: SavedListing; listing: ScoredListing }[] }>("/api/saved"),
  unsave: (listingId) => request<{ ok: true }>(`/api/saved/${listingId}`, { method: "DELETE" }),

  alerts: () => request<{ alerts: Alert[] }>("/api/alerts"),
  markAlertRead: (id) => request<{ ok: true }>(`/api/alerts/${id}/read`, { method: "POST" }),
  checkWatchdog: () =>
    request<{ created: number; alerts: Alert[] }>("/api/alerts/check", { method: "POST" }),
};

// Static demo (Vercel): no server, run everything in-browser. Dev uses the HTTP
// client unless VITE_STATIC=true is set.
export const IS_STATIC =
  import.meta.env.VITE_STATIC === "true" ||
  (import.meta.env.PROD && !import.meta.env.VITE_API_BASE);

export const api: ApiClient = IS_STATIC ? localApi : httpApi;

export { ApiError, getToken, setToken };
export type {
  ApiClient,
  CoachResponse,
  ListingDetail,
  ListingSearchInput,
  MetaResponse,
  SearchItem,
  SearchResponse,
} from "./apiTypes";
