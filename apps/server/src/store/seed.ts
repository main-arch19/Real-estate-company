import { buildSeed as buildSharedSeed, type SeedData } from "@rep/shared";
import { randomId } from "../crypto.js";

export type { SeedData } from "@rep/shared";

/** Server seed: the shared dataset built with crypto-random ids. */
export function buildSeed(): SeedData {
  return buildSharedSeed(randomId);
}

// `npm run seed` prints a summary for sanity-checking.
if (import.meta.url === `file://${process.argv[1]}`) {
  const data = buildSeed();
  console.log(
    `Seed: ${data.listings.length} listings, ${data.priceHistory.length} price points, ` +
      `${data.verifications.length} verifications, ${data.comps.length} comps.`,
  );
}
