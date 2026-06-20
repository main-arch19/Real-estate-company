import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import type { ScoredListing } from "@rep/shared";
import { useMeta } from "../lib/meta";
import { pinLabel } from "../lib/format";

/** Free, no-token raster style (OpenStreetMap tiles). */
const RASTER_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
    },
  },
  layers: [{ id: "osm", type: "raster", source: "osm" }],
};

/** Pin background by verification tier — paired with the price label (not color alone). */
function pinColor(tier: number): string {
  if (tier >= 3) return "#0E9F6E"; // success
  if (tier === 2) return "#009FE3"; // accent
  if (tier === 1) return "#0A3D8F"; // primary
  return "#D92D20"; // danger — unverified
}

const CLUSTER_PX = 46;

export function MapPanel({
  items,
  hoveredId,
  onHover,
  onMoveEnd,
}: {
  items: ScoredListing[];
  hoveredId: string | null;
  onHover: (id: string | null) => void;
  onMoveEnd?: (bbox: { minLng: number; minLat: number; maxLng: number; maxLat: number }) => void;
}) {
  const meta = useMeta();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const pinEls = useRef<Map<string, HTMLElement>>(new Map());
  const itemsRef = useRef(items);
  const onHoverRef = useRef(onHover);
  const onMoveEndRef = useRef(onMoveEnd);
  itemsRef.current = items;
  onHoverRef.current = onHover;
  onMoveEndRef.current = onMoveEnd;

  // Initialize the map once.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: RASTER_STYLE,
      center: meta.marketConfig.defaultCenter,
      zoom: meta.marketConfig.defaultZoom,
      attributionControl: { compact: true },
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.on("load", () => render());
    map.on("moveend", () => {
      render();
      if (onMoveEndRef.current) {
        const b = map.getBounds();
        onMoveEndRef.current({
          minLng: b.getWest(),
          minLat: b.getSouth(),
          maxLng: b.getEast(),
          maxLat: b.getNorth(),
        });
      }
    });
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-render markers when items change.
  useEffect(() => {
    render();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  // Toggle active pin on hover without a full re-render.
  useEffect(() => {
    pinEls.current.forEach((el, id) => {
      el.dataset.active = String(id === hoveredId);
    });
  }, [hoveredId]);

  function render() {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    const data = itemsRef.current;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    pinEls.current.clear();

    // Greedy pixel-proximity clustering so pins merge when zoomed out.
    type Cluster = { items: ScoredListing[]; x: number; y: number };
    const clusters: Cluster[] = [];
    for (const item of data) {
      const p = map.project([item.geo.lng, item.geo.lat]);
      const found = clusters.find((c) => Math.hypot(c.x - p.x, c.y - p.y) < CLUSTER_PX);
      if (found) found.items.push(item);
      else clusters.push({ items: [item], x: p.x, y: p.y });
    }

    for (const cluster of clusters) {
      if (cluster.items.length === 1) {
        const item = cluster.items[0]!;
        const el = document.createElement("button");
        el.className = "price-pin";
        el.type = "button";
        el.style.background = pinColor(item.verificationTier);
        el.style.color = "#fff";
        el.textContent = pinLabel(item.price, meta.marketConfig.currencySymbol);
        el.dataset.active = String(item.id === hoveredId);
        el.setAttribute("aria-label", `${item.title}, ${pinLabel(item.price, meta.marketConfig.currencySymbol)}`);
        el.addEventListener("mouseenter", () => onHoverRef.current(item.id));
        el.addEventListener("mouseleave", () => onHoverRef.current(null));
        el.addEventListener("click", () => {
          window.location.assign(`/listing/${item.id}`);
        });
        pinEls.current.set(item.id, el);
        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([item.geo.lng, item.geo.lat])
          .addTo(map);
        markersRef.current.push(marker);
      } else {
        const el = document.createElement("button");
        el.className = "price-pin";
        el.type = "button";
        el.style.background = "#1A1A2E";
        el.style.color = "#fff";
        el.textContent = `${cluster.items.length} homes`;
        el.setAttribute("aria-label", `${cluster.items.length} homes — zoom in`);
        const center = cluster.items[0]!.geo;
        el.addEventListener("click", () => {
          map.easeTo({ center: [center.lng, center.lat], zoom: map.getZoom() + 2 });
        });
        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([center.lng, center.lat])
          .addTo(map);
        markersRef.current.push(marker);
      }
    }
  }

  // Recenter when the result set's centroid shifts substantially (e.g. new search).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || items.length === 0) return;
    const lngs = items.map((i) => i.geo.lng);
    const lats = items.map((i) => i.geo.lat);
    const bounds = new maplibregl.LngLatBounds(
      [Math.min(...lngs), Math.min(...lats)],
      [Math.max(...lngs), Math.max(...lats)],
    );
    map.fitBounds(bounds, { padding: 60, maxZoom: 13, duration: 600 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.map((i) => i.id).join(",")]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full rounded-[12px]"
      role="application"
      aria-label="Map of listings"
    />
  );
}
