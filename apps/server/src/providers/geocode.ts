import type { GeoPoint } from "@rep/shared";
import { distanceKm, marketConfig } from "@rep/shared";
import type { GeocodeProvider, GeocodeResult } from "./types.js";

/**
 * Offline geocoder keyed to the active market. For jamaica this is a parish /
 * area lookup table — no external API needed. Swappable for a geocoding API in
 * other markets without touching callers.
 */
const JAMAICA_PLACES: { region: string; label: string; center: GeoPoint }[] = [
  { region: "Kingston", label: "Kingston", center: { lng: -76.7936, lat: 18.0179 } },
  { region: "St. Andrew", label: "New Kingston, St. Andrew", center: { lng: -76.7869, lat: 18.0089 } },
  { region: "St. Andrew", label: "Liguanea, St. Andrew", center: { lng: -76.7669, lat: 18.0211 } },
  { region: "St. Andrew", label: "Stony Hill, St. Andrew", center: { lng: -76.7796, lat: 18.0712 } },
  { region: "St. Catherine", label: "Portmore, St. Catherine", center: { lng: -76.8794, lat: 17.9559 } },
  { region: "St. Catherine", label: "Spanish Town, St. Catherine", center: { lng: -76.9574, lat: 17.9913 } },
  { region: "St. James", label: "Montego Bay, St. James", center: { lng: -77.9186, lat: 18.4762 } },
  { region: "St. Ann", label: "Ocho Rios, St. Ann", center: { lng: -77.1031, lat: 18.4076 } },
  { region: "St. Ann", label: "Discovery Bay, St. Ann", center: { lng: -77.4039, lat: 18.4681 } },
  { region: "Manchester", label: "Mandeville, Manchester", center: { lng: -77.5075, lat: 18.042 } },
  { region: "Westmoreland", label: "Negril, Westmoreland", center: { lng: -78.347, lat: 18.2682 } },
  { region: "St. Thomas", label: "Yallahs, St. Thomas", center: { lng: -76.5611, lat: 17.8731 } },
];

export const offlineGeocodeProvider: GeocodeProvider = {
  reverse(point: GeoPoint): GeocodeResult {
    let best = JAMAICA_PLACES[0]!;
    let bestDist = Infinity;
    for (const place of JAMAICA_PLACES) {
      const d = distanceKm(point, place.center);
      if (d < bestDist) {
        bestDist = d;
        best = place;
      }
    }
    return best;
  },
  search(query: string): GeocodeResult[] {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return JAMAICA_PLACES.filter(
      (p) => p.label.toLowerCase().includes(q) || p.region.toLowerCase().includes(q),
    );
  },
};

/** Generic fallback: returns the market default center for any query. */
export const genericGeocodeProvider: GeocodeProvider = {
  reverse(): GeocodeResult {
    return {
      region: marketConfig.regionNoun,
      label: "Current area",
      center: { lng: marketConfig.defaultCenter[0], lat: marketConfig.defaultCenter[1] },
    };
  },
  search(): GeocodeResult[] {
    return [];
  },
};
