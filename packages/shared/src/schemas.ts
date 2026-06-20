import { z } from "zod";

/** Zod schemas for validating server inputs. Reused on the client for forms. */

export const boundingBoxSchema = z.object({
  minLng: z.number(),
  minLat: z.number(),
  maxLng: z.number(),
  maxLat: z.number(),
});

export const listingQuerySchema = z.object({
  bbox: boundingBoxSchema.optional(),
  near: z.object({ lng: z.number(), lat: z.number() }).optional(),
  region: z.string().optional(),
  mode: z.enum(["buy", "rent"]).optional(),
  minPrice: z.number().nonnegative().optional(),
  maxPrice: z.number().nonnegative().optional(),
  beds: z.number().int().nonnegative().optional(),
  baths: z.number().int().nonnegative().optional(),
  type: z.enum(["house", "apartment", "townhouse", "land", "commercial"]).optional(),
  affordableOnly: z.boolean().optional(),
});
export type ListingQuery = z.infer<typeof listingQuerySchema>;

export const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const buyerProfileInputSchema = z.object({
  grossAnnualIncome: z.number().positive(),
  monthlyDebts: z.number().nonnegative(),
  downPayment: z.number().nonnegative(),
  employmentType: z.enum(["salaried", "self_employed", "contract", "other"]),
  dependents: z.number().int().nonnegative().optional(),
});
export type BuyerProfileInput = z.infer<typeof buyerProfileInputSchema>;

export const coachRequestSchema = z.object({
  listingId: z.string(),
});

export const offerDraftSchema = z.object({
  offerPrice: z.number().positive(),
  depositPercent: z.number().min(0).max(100),
  conditions: z.array(z.string()),
  closingTimelineDays: z.number().int().positive(),
  inclusions: z.array(z.string()),
  notes: z.string(),
});

export const saveListingSchema = z.object({
  listingId: z.string(),
  watchdogEnabled: z.boolean(),
  sensitivity: z.enum(["passive", "balanced", "aggressive"]),
});

export const reportListingSchema = z.object({
  listingId: z.string(),
  reason: z.string().min(1),
  detail: z.string().optional(),
});
