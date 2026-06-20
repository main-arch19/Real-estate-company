import type {
  Alert,
  AlertTrigger,
  BuyerProfile,
  BuyerProfileInput,
  Comp,
  EmploymentType,
  Listing,
  ListingReport,
  Offer,
  OfferDraft,
  PriceChange,
  SavedListing,
  User,
  VerificationRecord,
  WatchSensitivity,
} from "@rep/shared";
import {
  decryptNumber,
  encryptNumber,
  hashPassword,
  randomId,
  verifyPassword,
} from "../crypto.js";
import { buildSeed } from "./seed.js";

/** Sensitive buyer-profile fields stored encrypted at rest. */
interface StoredProfile {
  id: string;
  userId: string;
  grossAnnualIncomeEnc: string;
  monthlyDebtsEnc: string;
  downPaymentEnc: string;
  employmentType: EmploymentType;
  dependents?: number;
  updatedAt: string;
}

interface StoredUser extends User {
  passwordHash: string;
}

/**
 * Process-lifetime in-memory store. This is the mock-first backend; the same
 * shapes map 1:1 to the Supabase schema in /supabase/schema.sql. Swapping
 * MARKET or wiring Supabase replaces the providers, not this contract.
 */
class MemoryStore {
  listings: Listing[];
  priceHistory: PriceChange[];
  comps: Comp[];
  verifications: VerificationRecord[];

  private users = new Map<string, StoredUser>(); // id -> user
  private usersByEmail = new Map<string, string>(); // email -> id
  private sessions = new Map<string, string>(); // token -> userId
  private profiles = new Map<string, StoredProfile>(); // userId -> profile
  private saved: SavedListing[] = [];
  private offers: Offer[] = [];
  private alerts: Alert[] = [];
  private reports: ListingReport[] = [];

  constructor() {
    const seed = buildSeed();
    this.listings = seed.listings;
    this.priceHistory = seed.priceHistory;
    this.comps = seed.comps;
    this.verifications = seed.verifications;
  }

  // ── Listings ──────────────────────────────────────────────────────────
  listingById(id: string): Listing | undefined {
    return this.listings.find((l) => l.id === id);
  }
  priceHistoryFor(id: string): PriceChange[] {
    return this.priceHistory.filter((p) => p.listingId === id);
  }
  compsFor(id: string): Comp[] {
    return this.comps.filter((c) => c.listingId === id);
  }
  verificationsFor(id: string): VerificationRecord[] {
    return this.verifications.filter((v) => v.listingId === id);
  }

  /** Apply a price change (used by tests / watchdog demos). */
  applyPriceChange(listingId: string, newPrice: number): void {
    const listing = this.listingById(listingId);
    if (!listing) return;
    listing.price = newPrice;
    this.priceHistory.push({
      id: randomId("ph"),
      listingId,
      price: newPrice,
      changedAt: new Date().toISOString(),
    });
  }

  // ── Users / auth ─────────────────────────────────────────────────────
  createUser(email: string, password: string, name: string): User {
    const normalized = email.toLowerCase();
    if (this.usersByEmail.has(normalized)) {
      throw new Error("email_taken");
    }
    const user: StoredUser = {
      id: randomId("usr"),
      email: normalized,
      name,
      passwordHash: hashPassword(password),
    };
    this.users.set(user.id, user);
    this.usersByEmail.set(normalized, user.id);
    return { id: user.id, email: user.email, name: user.name };
  }

  authenticate(email: string, password: string): User | null {
    const id = this.usersByEmail.get(email.toLowerCase());
    if (!id) return null;
    const user = this.users.get(id);
    if (!user || !verifyPassword(password, user.passwordHash)) return null;
    return { id: user.id, email: user.email, name: user.name };
  }

  userById(id: string): User | undefined {
    const u = this.users.get(id);
    return u ? { id: u.id, email: u.email, name: u.name } : undefined;
  }

  createSession(userId: string): string {
    const token = randomId("sess");
    this.sessions.set(token, userId);
    return token;
  }
  userIdForToken(token: string): string | undefined {
    return this.sessions.get(token);
  }
  destroySession(token: string): void {
    this.sessions.delete(token);
  }

  // ── Buyer profile (encrypted) ────────────────────────────────────────
  // Param is the Zod-inferred input type so the route's `parsed.data` always
  // matches exactly (no hand-written shape to drift from inference). Fields are
  // coerced with defaults so this compiles whether they infer as required or
  // optional; Zod validation guarantees presence at runtime, so defaults are inert.
  upsertProfile(userId: string, input: BuyerProfileInput): BuyerProfile {
    const existing = this.profiles.get(userId);
    const employmentType: EmploymentType = input.employmentType ?? "salaried";
    const stored: StoredProfile = {
      id: existing?.id ?? randomId("bp"),
      userId,
      grossAnnualIncomeEnc: encryptNumber(input.grossAnnualIncome ?? 0),
      monthlyDebtsEnc: encryptNumber(input.monthlyDebts ?? 0),
      downPaymentEnc: encryptNumber(input.downPayment ?? 0),
      employmentType,
      dependents: input.dependents,
      updatedAt: new Date().toISOString(),
    };
    this.profiles.set(userId, stored);
    return this.decryptProfile(stored);
  }

  getProfile(userId: string): BuyerProfile | undefined {
    const stored = this.profiles.get(userId);
    return stored ? this.decryptProfile(stored) : undefined;
  }

  private decryptProfile(stored: StoredProfile): BuyerProfile {
    return {
      id: stored.id,
      userId: stored.userId,
      grossAnnualIncome: decryptNumber(stored.grossAnnualIncomeEnc),
      monthlyDebts: decryptNumber(stored.monthlyDebtsEnc),
      downPayment: decryptNumber(stored.downPaymentEnc),
      employmentType: stored.employmentType,
      dependents: stored.dependents,
      updatedAt: stored.updatedAt,
    };
  }

  // ── Saved listings / watchdog ────────────────────────────────────────
  saveListing(
    userId: string,
    listingId: string,
    watchdogEnabled: boolean,
    sensitivity: WatchSensitivity,
  ): SavedListing {
    const existing = this.saved.find(
      (s) => s.userId === userId && s.listingId === listingId,
    );
    if (existing) {
      existing.watchdogEnabled = watchdogEnabled;
      existing.sensitivity = sensitivity;
      return existing;
    }
    const saved: SavedListing = {
      id: randomId("save"),
      userId,
      listingId,
      watchdogEnabled,
      sensitivity,
      createdAt: new Date().toISOString(),
    };
    this.saved.push(saved);
    return saved;
  }
  savedForUser(userId: string): SavedListing[] {
    return this.saved.filter((s) => s.userId === userId);
  }
  removeSaved(userId: string, listingId: string): void {
    this.saved = this.saved.filter(
      (s) => !(s.userId === userId && s.listingId === listingId),
    );
  }
  allWatched(): SavedListing[] {
    return this.saved.filter((s) => s.watchdogEnabled);
  }
  markSignalChecked(savedId: string): void {
    const s = this.saved.find((x) => x.id === savedId);
    if (s) s.lastSignalAt = new Date().toISOString();
  }

  // ── Offers ───────────────────────────────────────────────────────────
  createOffer(
    userId: string,
    listingId: string,
    draft: OfferDraft,
    disclaimerVersion: string,
  ): Offer {
    const offer: Offer = {
      id: randomId("offer"),
      userId,
      listingId,
      draft,
      status: "draft",
      disclaimerVersion,
      createdAt: new Date().toISOString(),
    };
    this.offers.push(offer);
    return offer;
  }
  offersForUser(userId: string): Offer[] {
    return this.offers.filter((o) => o.userId === userId);
  }

  // ── Alerts ───────────────────────────────────────────────────────────
  createAlert(
    userId: string,
    listingId: string,
    trigger: AlertTrigger,
    message: string,
  ): Alert {
    const alert: Alert = {
      id: randomId("alert"),
      userId,
      listingId,
      trigger,
      message,
      sentAt: new Date().toISOString(),
    };
    this.alerts.push(alert);
    return alert;
  }
  alertsForUser(userId: string): Alert[] {
    return this.alerts
      .filter((a) => a.userId === userId)
      .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
  }
  markAlertRead(userId: string, alertId: string): void {
    const a = this.alerts.find((x) => x.id === alertId && x.userId === userId);
    if (a) a.readAt = new Date().toISOString();
  }

  // ── Reports / moderation queue ───────────────────────────────────────
  createReport(
    listingId: string,
    reason: string,
    detail: string | undefined,
    reportedBy: string | undefined,
  ): ListingReport {
    const report: ListingReport = {
      id: randomId("rep"),
      listingId,
      reason,
      detail,
      reportedBy,
      createdAt: new Date().toISOString(),
      status: "open",
    };
    this.reports.push(report);
    return report;
  }
  allReports(): ListingReport[] {
    return this.reports;
  }
}

export const store = new MemoryStore();
