import { useCallback, useState } from "react";

export type GeoState = "idle" | "locating" | "located" | "denied" | "unsupported";

export interface GeoCoords {
  lng: number;
  lat: number;
}

/** Browser geolocation with explicit, never-dead-end states. */
export function useGeolocation() {
  const [state, setState] = useState<GeoState>("idle");
  const [coords, setCoords] = useState<GeoCoords | null>(null);

  const request = useCallback((): Promise<GeoCoords | null> => {
    if (!("geolocation" in navigator)) {
      setState("unsupported");
      return Promise.resolve(null);
    }
    setState("locating");
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const c = { lng: pos.coords.longitude, lat: pos.coords.latitude };
          setCoords(c);
          setState("located");
          resolve(c);
        },
        () => {
          setState("denied");
          resolve(null);
        },
        { timeout: 10_000, enableHighAccuracy: false },
      );
    });
  }, []);

  return { state, coords, request, setCoords, setState };
}
