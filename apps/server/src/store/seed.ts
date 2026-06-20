import type {
  Comp,
  Listing,
  ListingType,
  PriceChange,
  VerificationRecord,
  VerificationTier,
} from "@rep/shared";
import { randomId } from "../crypto.js";

function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * 86400_000).toISOString();
}

interface SeedSpec {
  title: string;
  address: string;
  region: string;
  geo: [number, number]; // [lng, lat]
  price: number;
  beds: number;
  baths: number;
  type: ListingType;
  areaSqft: number;
  strataMonthly?: number;
  listedDaysAgo: number;
  /** Cuts: [price, daysAgo] from list price, oldest→newest. */
  cuts?: [number, number][];
  firstPrice?: number;
  tier: VerificationTier;
  imageSeed: string;
  description: string;
}

const SPECS: SeedSpec[] = [
  {
    title: "Bright 3-bed in Mona Heights",
    address: "12 Garelli Ave, Mona Heights",
    region: "St. Andrew",
    geo: [-76.7461, 18.0125],
    price: 42_000_000,
    firstPrice: 46_000_000,
    cuts: [[44_000_000, 40], [42_000_000, 12]],
    beds: 3,
    baths: 2,
    type: "house",
    areaSqft: 1850,
    listedDaysAgo: 96,
    tier: 3,
    imageSeed: "mona",
    description:
      "Move-in ready family home on a quiet cul-de-sac, walkable to UWI. Solar-ready roof, gated yard, mature fruit trees.",
  },
  {
    title: "New Kingston 2-bed condo with pool",
    address: "5 Belmont Rd, New Kingston",
    region: "St. Andrew",
    geo: [-76.7869, 18.0089],
    price: 33_500_000,
    beds: 2,
    baths: 2,
    type: "apartment",
    areaSqft: 1100,
    strataMonthly: 42_000,
    listedDaysAgo: 18,
    tier: 2,
    imageSeed: "newkingston",
    description:
      "Secure complex steps from the business district. 24-hour security, backup water, shared pool and gym.",
  },
  {
    title: "Townhouse in Portmore Pines",
    address: "8 Pine Walk, Greater Portmore",
    region: "St. Catherine",
    geo: [-76.8821, 17.9512],
    price: 21_000_000,
    firstPrice: 24_500_000,
    cuts: [[23_000_000, 55], [21_500_000, 25], [21_000_000, 7]],
    beds: 3,
    baths: 2,
    type: "townhouse",
    areaSqft: 1300,
    strataMonthly: 18_000,
    listedDaysAgo: 132,
    tier: 1,
    imageSeed: "portmore",
    description:
      "Well-kept end unit in a family scheme. Tiled throughout, water tank, room to extend at the back.",
  },
  {
    title: "Hillside villa above Montego Bay",
    address: "14 Spring Farm, Montego Bay",
    region: "St. James",
    geo: [-77.9089, 18.4901],
    price: 78_000_000,
    beds: 4,
    baths: 4,
    type: "house",
    areaSqft: 3200,
    listedDaysAgo: 9,
    tier: 3,
    imageSeed: "mobay",
    description:
      "Sweeping harbour views, infinity-edge pool, self-contained guest suite. Title clean and current.",
  },
  {
    title: "Ocho Rios beachside 1-bed",
    address: "Turtle Beach Towers, Ocho Rios",
    region: "St. Ann",
    geo: [-77.1056, 18.4099],
    price: 18_900_000,
    firstPrice: 20_000_000,
    cuts: [[18_900_000, 14]],
    beds: 1,
    baths: 1,
    type: "apartment",
    areaSqft: 720,
    strataMonthly: 35_000,
    listedDaysAgo: 47,
    tier: 2,
    imageSeed: "ochi",
    description:
      "Steps from the sand, strong short-let history. Furnished, beach access, on-site management.",
  },
  {
    title: "Mandeville bungalow on half-acre",
    address: "3 Bloomfield Cres, Mandeville",
    region: "Manchester",
    geo: [-77.5061, 18.0451],
    price: 36_000_000,
    beds: 3,
    baths: 2,
    type: "house",
    areaSqft: 2000,
    listedDaysAgo: 64,
    tier: 1,
    imageSeed: "mandeville",
    description:
      "Cool-climate living on a generous lot. Established garden, double carport, separate laundry.",
  },
  {
    title: "Negril development lot (titled)",
    address: "West End Rd, Negril",
    region: "Westmoreland",
    geo: [-78.3631, 18.2629],
    price: 15_500_000,
    firstPrice: 19_000_000,
    cuts: [[17_500_000, 70], [15_500_000, 20]],
    beds: 0,
    baths: 0,
    type: "land",
    areaSqft: 10_890,
    listedDaysAgo: 150,
    tier: 1,
    imageSeed: "negril",
    description:
      "Quarter-acre titled lot near the cliffs. Power and water at the road. Ideal for a boutique build.",
  },
  {
    title: "Liguanea garden apartment",
    address: "21 Hope Rd, Liguanea",
    region: "St. Andrew",
    geo: [-76.7669, 18.0211],
    price: 27_000_000,
    beds: 2,
    baths: 2,
    type: "apartment",
    areaSqft: 980,
    strataMonthly: 30_000,
    listedDaysAgo: 3,
    tier: 2,
    imageSeed: "liguanea",
    description:
      "Ground-floor unit with a private patio in a leafy complex. Close to shops and the hospital.",
  },
  {
    title: "Spanish Town starter home",
    address: "10 Brunswick Ave, Spanish Town",
    region: "St. Catherine",
    geo: [-76.9574, 17.9913],
    price: 13_500_000,
    firstPrice: 15_000_000,
    cuts: [[14_200_000, 38], [13_500_000, 10]],
    beds: 2,
    baths: 1,
    type: "house",
    areaSqft: 900,
    listedDaysAgo: 88,
    tier: 0,
    imageSeed: "spanishtown",
    description:
      "Affordable two-bed needing light cosmetic work. Fenced, secure burglar bars, room to grow.",
  },
  {
    title: "Stony Hill view home",
    address: "6 Skyline Dr, Stony Hill",
    region: "St. Andrew",
    geo: [-76.7796, 18.0712],
    price: 58_000_000,
    beds: 4,
    baths: 3,
    type: "house",
    areaSqft: 2800,
    listedDaysAgo: 27,
    tier: 3,
    imageSeed: "stonyhill",
    description:
      "Elevated home with city-light views, open-plan living, double-height ceilings, fruit-tree garden.",
  },
  {
    title: "Old Harbour commercial space",
    address: "Main St, Old Harbour",
    region: "St. Catherine",
    geo: [-77.1083, 17.9411],
    price: 31_000_000,
    beds: 0,
    baths: 2,
    type: "commercial",
    areaSqft: 2400,
    listedDaysAgo: 110,
    firstPrice: 34_000_000,
    cuts: [[31_000_000, 35]],
    tier: 1,
    imageSeed: "oldharbour",
    description:
      "High-traffic storefront with mezzanine. Suited to retail or services. Parking at the rear.",
  },
  {
    title: "Discovery Bay sea-view duplex",
    address: "Puerto Seco Dr, Discovery Bay",
    region: "St. Ann",
    geo: [-77.4039, 18.4681],
    price: 49_500_000,
    beds: 3,
    baths: 3,
    type: "townhouse",
    areaSqft: 1700,
    strataMonthly: 28_000,
    listedDaysAgo: 6,
    tier: 2,
    imageSeed: "discovery",
    description:
      "Modern duplex a short walk to the beach. Solar water heating, gated, ready for short-let income.",
  },
  {
    title: "Unverified 'bargain' lot — Yallahs",
    address: "Off Main Rd, Yallahs",
    region: "St. Thomas",
    geo: [-76.5611, 17.8731],
    price: 4_900_000,
    beds: 0,
    baths: 0,
    type: "land",
    areaSqft: 6000,
    listedDaysAgo: 75,
    tier: 0,
    imageSeed: "yallahs",
    description:
      "Priced well below the area — confirm title and boundaries before any payment. Seller unverified.",
  },
  {
    title: "Constant Spring 2-bed",
    address: "4 Eastwood Park Rd, Kingston",
    region: "St. Andrew",
    geo: [-76.7989, 18.0301],
    price: 24_500_000,
    beds: 2,
    baths: 2,
    type: "apartment",
    areaSqft: 950,
    strataMonthly: 26_000,
    listedDaysAgo: 52,
    firstPrice: 26_000_000,
    cuts: [[24_500_000, 21]],
    tier: 1,
    imageSeed: "constant",
    description:
      "Bright corner unit with cross-ventilation, covered parking, and reliable building management.",
  },
];

export interface SeedData {
  listings: Listing[];
  priceHistory: PriceChange[];
  comps: Comp[];
  verifications: VerificationRecord[];
}

export function buildSeed(): SeedData {
  const listings: Listing[] = [];
  const priceHistory: PriceChange[] = [];
  const comps: Comp[] = [];
  const verifications: VerificationRecord[] = [];

  for (const s of SPECS) {
    const id = randomId("lst");
    listings.push({
      id,
      title: s.title,
      address: s.address,
      region: s.region,
      geo: { lng: s.geo[0], lat: s.geo[1] },
      price: s.price,
      mode: "buy",
      beds: s.beds,
      baths: s.baths,
      areaSqft: s.areaSqft,
      type: s.type,
      status: "active",
      listedAt: daysAgoIso(s.listedDaysAgo),
      images: [0, 1, 2].map(
        (n) => `https://picsum.photos/seed/${s.imageSeed}${n}/960/640`,
      ),
      description: s.description,
      strataMonthly: s.strataMonthly,
      ownerId: randomId("usr"),
      verificationTier: s.tier,
    });

    // Price history: first list price, then each cut.
    const firstPrice = s.firstPrice ?? s.price;
    priceHistory.push({
      id: randomId("ph"),
      listingId: id,
      price: firstPrice,
      changedAt: daysAgoIso(s.listedDaysAgo),
    });
    for (const [price, daysAgo] of s.cuts ?? []) {
      priceHistory.push({
        id: randomId("ph"),
        listingId: id,
        price,
        changedAt: daysAgoIso(daysAgo),
      });
    }

    // Verifications: one record per achieved tier up to the listing's tier.
    const methods: Record<number, string> = {
      1: "Title / registration reference confirmed",
      2: "Agent / owner identity verified (ID + contact)",
      3: "In-person, geo/time-stamped photo confirmation",
    };
    for (let t = 1; t <= s.tier; t++) {
      verifications.push({
        id: randomId("ver"),
        listingId: id,
        tier: t as VerificationTier,
        method: methods[t] ?? "",
        verifiedBy: "Scam-Shield",
        verifiedAt: daysAgoIso(Math.max(1, s.listedDaysAgo - t)),
      });
    }
    // NOTE: jamaica has no MLS, so we intentionally seed NO comps here. The
    // CompsProvider for this market reports compsAvailable=false and the Deal
    // Score + Coach degrade honestly. (us/generic markets would seed comps.)
  }

  return { listings, priceHistory, comps, verifications };
}

// Allow `npm run seed` to print a summary for sanity-checking.
if (import.meta.url === `file://${process.argv[1]}`) {
  const data = buildSeed();
  console.log(
    `Seed: ${data.listings.length} listings, ${data.priceHistory.length} price points, ` +
      `${data.verifications.length} verifications, ${data.comps.length} comps.`,
  );
}
