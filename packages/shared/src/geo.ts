import type { BoundingBox, GeoPoint } from "./types.js";

const EARTH_RADIUS_KM = 6371;

/** Haversine great-circle distance in kilometers. */
export function distanceKm(a: GeoPoint, b: GeoPoint): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

export function withinBox(point: GeoPoint, box: BoundingBox): boolean {
  return (
    point.lng >= box.minLng &&
    point.lng <= box.maxLng &&
    point.lat >= box.minLat &&
    point.lat <= box.maxLat
  );
}

/** Build a bounding box of `radiusKm` around a center point. */
export function boxAround(center: GeoPoint, radiusKm: number): BoundingBox {
  const latDelta = radiusKm / 111; // ~111 km per degree latitude
  const lngDelta = radiusKm / (111 * Math.cos(toRad(center.lat)) || 1);
  return {
    minLng: center.lng - lngDelta,
    maxLng: center.lng + lngDelta,
    minLat: center.lat - latDelta,
    maxLat: center.lat + latDelta,
  };
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}
