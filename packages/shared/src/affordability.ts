import { marketConfig } from "./config.js";
import type {
  AffordabilityResult,
  BuyerProfile,
  Listing,
  TrueMonthlyCost,
} from "./types.js";

/**
 * Affordability reverse-engineering.
 *
 * Uses standard DTI front-end / back-end ratios plus the market's configurable
 * rate table (NOT a US rate API — see config.ts MARKET_CONFIG.rateTable). The
 * result is the maximum price the buyer can support, plus a monthly housing
 * budget used to badge listings as within-budget.
 *
 *   FRONT_END_RATIO — housing cost as a share of gross monthly income.
 *   BACK_END_RATIO  — (housing + other debts) as a share of gross monthly income.
 * The binding constraint is whichever leaves the smaller housing allowance.
 */

const FRONT_END_RATIO = 0.31;
const BACK_END_RATIO = 0.43;

/** Self-employed / contract income is haircut for conservatism. */
const INCOME_HAIRCUT: Record<BuyerProfile["employmentType"], number> = {
  salaried: 1.0,
  contract: 0.9,
  self_employed: 0.85,
  other: 0.85,
};

/** Annual non-P&I carrying costs as a fraction of price (tax + insurance). */
const ANNUAL_TAX_RATE = 0.0075;
const ANNUAL_INSURANCE_RATE = 0.004;

/** Monthly mortgage insurance applies when down payment < this fraction. */
const MI_THRESHOLD = 0.2;
const MI_ANNUAL_RATE = 0.008;

function defaultTerm(): { termYears: number; annualRate: number } {
  // Use the longest term in the table as the affordability baseline.
  const longest = [...marketConfig.rateTable].sort((a, b) => b.termYears - a.termYears)[0];
  return longest ?? { termYears: 30, annualRate: 0.07 };
}

/** Monthly payment for a fully amortizing loan. */
export function monthlyPayment(principal: number, annualRate: number, termYears: number): number {
  if (principal <= 0) return 0;
  const r = annualRate / 12;
  const n = termYears * 12;
  if (r === 0) return principal / n;
  return (principal * r) / (1 - Math.pow(1 + r, -n));
}

/** Loan principal supportable by a given monthly P&I budget. */
function principalForPayment(payment: number, annualRate: number, termYears: number): number {
  if (payment <= 0) return 0;
  const r = annualRate / 12;
  const n = termYears * 12;
  if (r === 0) return payment * n;
  return (payment * (1 - Math.pow(1 + r, -n))) / r;
}

export function computeAffordability(profile: BuyerProfile): AffordabilityResult {
  const { termYears, annualRate } = defaultTerm();
  const grossMonthly =
    (profile.grossAnnualIncome * INCOME_HAIRCUT[profile.employmentType]) / 12;

  const frontEndBudget = grossMonthly * FRONT_END_RATIO;
  const backEndBudget = grossMonthly * BACK_END_RATIO - profile.monthlyDebts;
  // Dependents trim discretionary capacity slightly.
  const dependentAdj = 1 - Math.min(0.15, (profile.dependents ?? 0) * 0.03);

  const monthlyHousingBudget = Math.max(0, Math.min(frontEndBudget, backEndBudget) * dependentAdj);

  // Reserve part of the housing budget for tax + insurance + (possible) MI so
  // the affordable price reflects true carrying cost, not just P&I.
  const carryFactor =
    (ANNUAL_TAX_RATE + ANNUAL_INSURANCE_RATE) / 12; // per dollar of price, per month
  // Solve: budget = P&I(price - down) + carry*price (+ MI if applicable).
  // Iterate a few times since MI depends on the resulting price.
  let price = 0;
  for (let i = 0; i < 6; i++) {
    const miFactor =
      profile.downPayment / Math.max(price, 1) < MI_THRESHOLD ? MI_ANNUAL_RATE / 12 : 0;
    const piBudget = monthlyHousingBudget - (carryFactor + miFactor) * price;
    const loan = principalForPayment(Math.max(0, piBudget), annualRate, termYears);
    price = loan + profile.downPayment;
    if (price < profile.downPayment) price = profile.downPayment;
  }

  return {
    maxAffordablePrice: Math.max(0, Math.round(price)),
    monthlyHousingBudget: Math.round(monthlyHousingBudget),
    frontEndRatio: FRONT_END_RATIO,
    backEndRatio: BACK_END_RATIO,
    assumedAnnualRate: annualRate,
    termYears,
  };
}

/**
 * Full monthly cost for a specific listing given the buyer's profile:
 * P&I + property tax + insurance + strata/HOA + mortgage insurance, plus
 * one-off purchase fees (stamp duty / closing) surfaced separately.
 */
export function computeTrueMonthlyCost(
  listing: Listing,
  profile: BuyerProfile,
  affordability: AffordabilityResult,
): TrueMonthlyCost {
  const { termYears, annualRate } = defaultTerm();
  const downPayment = Math.min(profile.downPayment, listing.price);
  const loan = Math.max(0, listing.price - downPayment);

  const principalAndInterest = monthlyPayment(loan, annualRate, termYears);
  const propertyTax = (listing.price * ANNUAL_TAX_RATE) / 12;
  const insurance = (listing.price * ANNUAL_INSURANCE_RATE) / 12;
  const strata = listing.strataMonthly ?? 0;
  const downFraction = listing.price > 0 ? downPayment / listing.price : 1;
  const mortgageInsurance =
    downFraction < MI_THRESHOLD ? (loan * MI_ANNUAL_RATE) / 12 : 0;

  const total = principalAndInterest + propertyTax + insurance + strata + mortgageInsurance;

  const oneOffFees = marketConfig.closingFees.map((f) => ({
    label: f.label,
    amount: Math.round(listing.price * f.rate),
  }));
  const oneOffFeesTotal = oneOffFees.reduce((sum, f) => sum + f.amount, 0);

  return {
    principalAndInterest: Math.round(principalAndInterest),
    propertyTax: Math.round(propertyTax),
    insurance: Math.round(insurance),
    strata: Math.round(strata),
    mortgageInsurance: Math.round(mortgageInsurance),
    total: Math.round(total),
    oneOffFees,
    oneOffFeesTotal,
    withinBudget: total <= affordability.monthlyHousingBudget,
  };
}
