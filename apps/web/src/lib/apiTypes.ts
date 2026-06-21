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

export interface GeocodeHit {
  region: string;
  label: string;
  center: { lng: number; lat: number };
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

export interface ProfileInput {
  grossAnnualIncome: number;
  monthlyDebts: number;
  downPayment: number;
  employmentType: string;
  dependents?: number;
}

/** The contract both the HTTP client and the in-browser demo client implement. */
export interface ApiClient {
  meta(): Promise<MetaResponse>;
  signup(email: string, password: string, name: string): Promise<{ token: string; user: User }>;
  login(email: string, password: string): Promise<{ token: string; user: User }>;
  me(): Promise<{ user: User | null }>;
  logout(): Promise<{ ok: true }>;
  reverseGeocode(lng: number, lat: number): Promise<{ result: GeocodeHit }>;
  searchPlaces(q: string): Promise<{ results: GeocodeHit[] }>;
  search(input: ListingSearchInput): Promise<SearchResponse>;
  listing(id: string, near?: { lng: number; lat: number }): Promise<ListingDetail>;
  report(id: string, reason: string, detail?: string): Promise<{ report: unknown }>;
  getProfile(): Promise<{ profile: BuyerProfile | null; affordability: AffordabilityResult | null }>;
  saveProfile(input: ProfileInput): Promise<{ profile: BuyerProfile; affordability: AffordabilityResult }>;
  coach(listingId: string): Promise<CoachResponse>;
  createOffer(listingId: string, draft: OfferDraft): Promise<{ offer: Offer }>;
  offers(): Promise<{ offers: Offer[] }>;
  save(
    listingId: string,
    watchdogEnabled: boolean,
    sensitivity: WatchSensitivity,
  ): Promise<{ saved: SavedListing }>;
  saved(): Promise<{ items: { saved: SavedListing; listing: ScoredListing }[] }>;
  unsave(listingId: string): Promise<{ ok: true }>;
  alerts(): Promise<{ alerts: Alert[] }>;
  markAlertRead(id: string): Promise<{ ok: true }>;
  checkWatchdog(): Promise<{ created: number; alerts: Alert[] }>;
}
