import type {
  CoachRead,
  Comp,
  GeoPoint,
  Listing,
  ListingSignals,
  VerificationTier,
} from "@rep/shared";
import type { ListingQuery } from "@rep/shared";

/**
 * Provider interfaces — the single seam through which MARKET changes the data
 * sources. UI and routes depend only on these; swapping MARKET swaps the
 * implementation in providers/index.ts without touching anything else.
 */

export interface ListingProvider {
  query(q: ListingQuery): Listing[];
  byId(id: string): Listing | undefined;
}

export interface CompsResult {
  comps: Comp[];
  /** False in no-MLS markets (jamaica/caribbean) → Coach + Deal Score degrade. */
  available: boolean;
}
export interface CompsProvider {
  readonly marketHasComps: boolean;
  forListing(listingId: string): CompsResult;
}

export interface RateProvider {
  table(): { termYears: number; annualRate: number }[];
  rateForTerm(termYears: number): number;
}

export interface GeocodeResult {
  region: string;
  label: string;
  center: GeoPoint;
}
export interface GeocodeProvider {
  /** Map a coordinate to the nearest named region. */
  reverse(point: GeoPoint): GeocodeResult;
  /** Forward search by area/region name. */
  search(query: string): GeocodeResult[];
}

export interface VerificationTierInfo {
  tier: VerificationTier;
  label: string;
  achieved: boolean;
  method?: string;
  verifiedAt?: string;
}
export interface VerificationProvider {
  readonly tier1Label: string;
  breakdown(listingId: string): VerificationTierInfo[];
}

export interface CoachInput {
  listing: Listing;
  signals: ListingSignals;
  /** Pre-computed offer-band anchors derived purely from observed signals. */
  anchors: { open: number; target: number; walk: number };
}
export interface AIProvider {
  coach(input: CoachInput): Promise<CoachRead>;
}

export interface Providers {
  listing: ListingProvider;
  comps: CompsProvider;
  rate: RateProvider;
  geocode: GeocodeProvider;
  verification: VerificationProvider;
  ai: AIProvider;
}
