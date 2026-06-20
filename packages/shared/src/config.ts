/**
 * Build re-targeting configuration.
 *
 * Changing TARGET_BUYER and MARKET re-shapes copy emphasis, default filters,
 * feature prominence, mode tabs, currency, the fee model, and which data
 * providers the server selects. Honor these flags throughout the app —
 * nothing market-specific should be hard-coded outside this module and the
 * provider layer.
 *
 * Values are read from env where available (server) and fall back to the
 * spec defaults (first_time_buyer / jamaica) everywhere else.
 */

export type TargetBuyer = "first_time_buyer" | "investor" | "luxury" | "rental";
export type Market = "jamaica" | "caribbean" | "us" | "generic";

function readEnv(key: string): string | undefined {
  // Works in Node (process.env) and Vite (import.meta.env), guarded so the
  // module is safe to import in either runtime.
  const g = globalThis as unknown as {
    process?: { env?: Record<string, string | undefined> };
  };
  const fromNode = g.process?.env?.[key];
  if (fromNode) return fromNode;
  try {
    // import.meta.env is only present under Vite; access defensively.
    const meta = import.meta as unknown as { env?: Record<string, string | undefined> };
    return meta.env?.[`VITE_${key}`] ?? meta.env?.[key];
  } catch {
    return undefined;
  }
}

export const TARGET_BUYER: TargetBuyer =
  (readEnv("TARGET_BUYER") as TargetBuyer | undefined) ?? "first_time_buyer";

export const MARKET: Market =
  (readEnv("MARKET") as Market | undefined) ?? "jamaica";

export type ModeTab = "buy" | "rent" | "invest";

interface BuyerConfig {
  /** Ordered tabs in the top nav. */
  modeTabs: ModeTab[];
  /** Which pillar leads the home page. */
  lead: "affordability" | "coach" | "verification" | "scam_shield";
  /** Coach tone. */
  coachTone: "plain" | "analytical" | "concierge";
  /** Show investor-only fields (cap rate / ROI). */
  showInvestorMetrics: boolean;
}

export const BUYER_CONFIG: Record<TargetBuyer, BuyerConfig> = {
  first_time_buyer: {
    modeTabs: ["buy", "rent"],
    lead: "affordability",
    coachTone: "plain",
    showInvestorMetrics: false,
  },
  investor: {
    modeTabs: ["buy", "invest"],
    lead: "coach",
    coachTone: "analytical",
    showInvestorMetrics: true,
  },
  luxury: {
    modeTabs: ["buy", "rent"],
    lead: "verification",
    coachTone: "concierge",
    showInvestorMetrics: false,
  },
  rental: {
    modeTabs: ["rent"],
    lead: "scam_shield",
    coachTone: "plain",
    showInvestorMetrics: false,
  },
};

interface MarketConfig {
  /** ISO currency + symbol used for all money formatting. */
  currency: string;
  currencySymbol: string;
  locale: string;
  /** Whether an MLS/comps source exists. Drives Coach degradation. */
  hasMls: boolean;
  /** Label for verification tier 1. */
  tier1Label: string;
  /** Map starting viewport [lng, lat] and zoom. */
  defaultCenter: [number, number];
  defaultZoom: number;
  /** Region noun used in copy ("parish" vs "county"). */
  regionNoun: string;
  /** One-off purchase fees surfaced separately from the monthly cost. */
  closingFees: { label: string; rate: number }[];
  /**
   * Configurable local annual mortgage rate table (decimal). For markets
   * without a live rate API (jamaica/caribbean), the RateProvider reads this.
   */
  rateTable: { termYears: number; annualRate: number }[];
  /** Scam-education topics surfaced contextually. */
  scamTopics: string[];
}

export const MARKET_CONFIG: Record<Market, MarketConfig> = {
  jamaica: {
    currency: "JMD",
    currencySymbol: "J$",
    locale: "en-JM",
    hasMls: false,
    tier1Label: "Title / registration reference confirmed",
    defaultCenter: [-76.7936, 18.0179], // Kingston
    defaultZoom: 11,
    regionNoun: "parish",
    closingFees: [
      { label: "Stamp duty", rate: 0.02 },
      { label: "Legal / conveyancing", rate: 0.02 },
      { label: "Registration & transfer", rate: 0.005 },
    ],
    rateTable: [
      { termYears: 30, annualRate: 0.0995 },
      { termYears: 25, annualRate: 0.0975 },
      { termYears: 15, annualRate: 0.0925 },
    ],
    scamTopics: ["capture_land", "squatter_land", "double_selling", "fake_listing"],
  },
  caribbean: {
    currency: "USD",
    currencySymbol: "$",
    locale: "en-US",
    hasMls: false,
    tier1Label: "Title / registration reference confirmed",
    defaultCenter: [-61.5, 13.16],
    defaultZoom: 10,
    regionNoun: "parish",
    closingFees: [
      { label: "Stamp duty", rate: 0.02 },
      { label: "Legal / conveyancing", rate: 0.02 },
    ],
    rateTable: [
      { termYears: 30, annualRate: 0.085 },
      { termYears: 15, annualRate: 0.08 },
    ],
    scamTopics: ["double_selling", "fake_listing"],
  },
  us: {
    currency: "USD",
    currencySymbol: "$",
    locale: "en-US",
    hasMls: true,
    tier1Label: "Title / escrow reference confirmed",
    defaultCenter: [-97.0, 38.5],
    defaultZoom: 4,
    regionNoun: "county",
    closingFees: [{ label: "Closing costs", rate: 0.03 }],
    // In the US market a live rate API replaces this table; kept as a fallback.
    rateTable: [
      { termYears: 30, annualRate: 0.069 },
      { termYears: 15, annualRate: 0.061 },
    ],
    scamTopics: ["fake_listing"],
  },
  generic: {
    currency: "USD",
    currencySymbol: "$",
    locale: "en-US",
    hasMls: false,
    tier1Label: "Ownership reference confirmed",
    defaultCenter: [0, 20],
    defaultZoom: 2,
    regionNoun: "region",
    closingFees: [],
    rateTable: [{ termYears: 30, annualRate: 0.07 }],
    scamTopics: ["fake_listing"],
  },
};

export const buyerConfig = BUYER_CONFIG[TARGET_BUYER];
export const marketConfig = MARKET_CONFIG[MARKET];

/** Format a money amount in the active market's currency. */
export function formatMoney(amount: number, opts: { decimals?: number } = {}): string {
  const { decimals = 0 } = opts;
  return new Intl.NumberFormat(marketConfig.locale, {
    style: "currency",
    currency: marketConfig.currency,
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  }).format(amount);
}
