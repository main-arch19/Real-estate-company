/** Domain types shared by server and web. Mirror the Postgres schema. */

export type ListingType = "house" | "apartment" | "townhouse" | "land" | "commercial";
export type ListingStatus = "active" | "under_offer" | "sold" | "withdrawn";
export type ListingMode = "buy" | "rent";

/** Verification tiers — each adds badge weight + ranking boost. */
export type VerificationTier = 0 | 1 | 2 | 3;

export interface GeoPoint {
  lng: number;
  lat: number;
}

export interface PriceChange {
  id: string;
  listingId: string;
  price: number;
  changedAt: string; // ISO
}

export interface Comp {
  id: string;
  listingId: string;
  compPrice: number;
  soldAt: string; // ISO
  source: string;
  confidence: number; // 0..1
}

export interface VerificationRecord {
  id: string;
  listingId: string;
  tier: VerificationTier;
  method: string;
  evidenceUrl?: string;
  verifiedBy?: string;
  verifiedAt: string; // ISO
}

export interface Listing {
  id: string;
  title: string;
  address: string;
  region: string; // parish / county
  geo: GeoPoint;
  price: number;
  mode: ListingMode;
  beds: number;
  baths: number;
  areaSqft?: number;
  type: ListingType;
  status: ListingStatus;
  listedAt: string; // ISO
  images: string[];
  description: string;
  strataMonthly?: number; // HOA / strata
  ownerId: string;
  /** Highest confirmed verification tier (0 = unverified). */
  verificationTier: VerificationTier;
}

/** A listing enriched with computed signals + Deal Score for results/detail. */
export interface ScoredListing extends Listing {
  signals: ListingSignals;
  dealScore: DealScore;
  distanceKm?: number;
}

/** Raw market signals computed per listing. */
export interface ListingSignals {
  daysOnMarket: number;
  priceCutCount: number;
  totalPriceCutPct: number; // e.g. 0.09 == down 9% from first list price
  priceCutDates: string[];
  firstListedPrice: number;
  /** list-to-comp delta, positive = listed above comps. null when comps absent. */
  listToCompDeltaPct: number | null;
  compCount: number;
  medianCompPrice: number | null;
  /** Seller behavior heuristics. */
  relistCount: number;
  expiredAndRelisted: boolean;
  /** True when this market has no comps source (Coach degrades). */
  compsAvailable: boolean;
}

export interface DealScore {
  /** 0..100 — higher = more buyer leverage / better deal. */
  score: number;
  band: "low" | "moderate" | "strong";
  /** Human-readable factor breakdown for transparency. */
  factors: { label: string; contribution: number; detail: string }[];
  /** True when comps were unavailable and weight was redistributed. */
  degraded: boolean;
}

export interface OfferBand {
  open: number;
  target: number;
  walk: number;
  openReasoning: string;
  targetReasoning: string;
  walkReasoning: string;
}

export interface CoachRead {
  /** One-line plain-language leverage read. */
  headline: string;
  band: OfferBand;
  /** Bulleted strategy points. */
  notes: string[];
  /** Whether comps were available to the Coach. */
  compsAvailable: boolean;
  /** "claude" or "mock" — surfaced for transparency, never hidden. */
  source: "claude" | "mock";
}

export type EmploymentType = "salaried" | "self_employed" | "contract" | "other";

export interface BuyerProfile {
  id: string;
  userId: string;
  grossAnnualIncome: number;
  monthlyDebts: number;
  downPayment: number;
  employmentType: EmploymentType;
  dependents?: number;
  updatedAt: string;
}

/** Output of affordability reverse-engineering. */
export interface AffordabilityResult {
  maxAffordablePrice: number;
  /** Monthly housing budget under the back-end DTI ceiling. */
  monthlyHousingBudget: number;
  frontEndRatio: number;
  backEndRatio: number;
  assumedAnnualRate: number;
  termYears: number;
}

/** Full monthly cost breakdown for a specific listing. */
export interface TrueMonthlyCost {
  principalAndInterest: number;
  propertyTax: number;
  insurance: number;
  strata: number;
  mortgageInsurance: number;
  total: number;
  /** One-off purchase fees, surfaced separately (stamp duty, closing, etc.). */
  oneOffFees: { label: string; amount: number }[];
  oneOffFeesTotal: number;
  withinBudget: boolean;
}

export type WatchSensitivity = "passive" | "balanced" | "aggressive";

export interface SavedListing {
  id: string;
  userId: string;
  listingId: string;
  watchdogEnabled: boolean;
  sensitivity: WatchSensitivity;
  lastSignalAt?: string;
  createdAt: string;
}

export type OfferStatus = "draft";

export interface OfferDraft {
  offerPrice: number;
  depositPercent: number;
  conditions: string[];
  closingTimelineDays: number;
  inclusions: string[];
  notes: string;
}

export interface Offer {
  id: string;
  userId: string;
  listingId: string;
  draft: OfferDraft;
  status: OfferStatus;
  /** Version of the disclaimer text shown at export time. */
  disclaimerVersion: string;
  createdAt: string;
}

export type AlertTrigger =
  | "new_price_cut"
  | "crossed_days_on_market"
  | "comp_shift"
  | "status_change";

export interface Alert {
  id: string;
  userId: string;
  listingId: string;
  trigger: AlertTrigger;
  message: string;
  sentAt: string;
  readAt?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface BoundingBox {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
}

export interface ListingReport {
  id: string;
  listingId: string;
  reason: string;
  detail?: string;
  reportedBy?: string;
  createdAt: string;
  status: "open" | "reviewing" | "resolved";
}
