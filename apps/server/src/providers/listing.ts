import type { Listing, ListingQuery } from "@rep/shared";
import { withinBox } from "@rep/shared";
import { store } from "../store/memory.js";
import type { ListingProvider } from "./types.js";

/** Mock listing provider backed by the in-memory seed store. */
export const mockListingProvider: ListingProvider = {
  query(q: ListingQuery): Listing[] {
    return store.listings.filter((l) => {
      if (l.status !== "active") return false;
      if (q.mode && l.mode !== q.mode) return false;
      if (q.bbox && !withinBox(l.geo, q.bbox)) return false;
      if (q.region && !l.region.toLowerCase().includes(q.region.toLowerCase()))
        return false;
      if (q.minPrice !== undefined && l.price < q.minPrice) return false;
      if (q.maxPrice !== undefined && l.price > q.maxPrice) return false;
      if (q.beds !== undefined && l.beds < q.beds) return false;
      if (q.baths !== undefined && l.baths < q.baths) return false;
      if (q.type && l.type !== q.type) return false;
      return true;
    });
  },
  byId(id: string): Listing | undefined {
    return store.listingById(id);
  },
};
