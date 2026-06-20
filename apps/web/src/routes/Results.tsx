import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api, type ListingSearchInput } from "../lib/api";
import { useAuth } from "../lib/auth";
import { useGeolocation } from "../lib/useGeolocation";
import { Button, EmptyState, ErrorState, Skeleton } from "../components/ui";
import { FilterRail, type Filters } from "../components/FilterRail";
import { SortBar } from "../components/SortBar";
import { ListingCard } from "../components/ListingCard";
import { MapPanel } from "../components/MapPanel";
import { Sheet } from "../components/ui";

type BBox = { minLng: number; minLat: number; maxLng: number; maxLat: number };

export function Results() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const geo = useGeolocation();

  // ── URL-derived state ──────────────────────────────────────────────
  const mode = (params.get("mode") as "buy" | "rent" | null) ?? undefined;
  const region = params.get("region") ?? undefined;
  const nearParam = params.get("near");
  const near = useMemo(() => {
    if (!nearParam) return undefined;
    const [lng, lat] = nearParam.split(",").map(Number);
    return lng != null && lat != null ? { lng, lat } : undefined;
  }, [nearParam]);

  const [filters, setFilters] = useState<Filters>(() => ({
    minPrice: params.get("minPrice") ? Number(params.get("minPrice")) : undefined,
    maxPrice: params.get("maxPrice") ? Number(params.get("maxPrice")) : undefined,
    beds: params.get("beds") ? Number(params.get("beds")) : undefined,
    baths: params.get("baths") ? Number(params.get("baths")) : undefined,
    type: params.get("type") ?? undefined,
    affordableOnly: params.get("affordable") === "1",
  }));
  const [sort, setSort] = useState(params.get("sort") ?? "recommended");
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [searchAsMove, setSearchAsMove] = useState(false);
  const [bbox, setBbox] = useState<BBox | null>(null);
  const [mobileView, setMobileView] = useState<"list" | "map">("list");
  const [filterSheet, setFilterSheet] = useState(false);

  // Persist key filters back to the URL.
  useEffect(() => {
    const next = new URLSearchParams(params);
    const setOrDel = (k: string, v: string | undefined) => (v ? next.set(k, v) : next.delete(k));
    setOrDel("minPrice", filters.minPrice?.toString());
    setOrDel("maxPrice", filters.maxPrice?.toString());
    setOrDel("beds", filters.beds?.toString());
    setOrDel("baths", filters.baths?.toString());
    setOrDel("type", filters.type);
    setOrDel("affordable", filters.affordableOnly ? "1" : undefined);
    setOrDel("sort", sort === "recommended" ? undefined : sort);
    setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, sort]);

  // Profile presence governs affordable-fit availability.
  const profileQuery = useQuery({
    queryKey: ["profile"],
    queryFn: api.getProfile,
    enabled: Boolean(user),
  });
  const affordableAvailable = Boolean(profileQuery.data?.profile);

  const searchInput: ListingSearchInput = {
    ...filters,
    mode,
    region,
    near,
    bbox: searchAsMove && bbox ? bbox : undefined,
    sort,
  };

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["search", searchInput, affordableAvailable],
    queryFn: () => api.search(searchInput),
  });

  const listings = data?.listings ?? [];

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-4">
      {/* Geolocation banner */}
      {!near && (
        <div className="mb-3 flex flex-wrap items-center gap-3 rounded-[10px] border border-accent/30 bg-accent/5 px-3 py-2">
          <button
            onClick={async () => {
              const c = await geo.request();
              if (c) navigate(`/results?near=${c.lng},${c.lat}`);
            }}
            className="inline-flex items-center gap-1.5 rounded-pill bg-accent px-3 py-1.5 text-sm font-semibold text-white"
          >
            <span aria-hidden="true">📍</span>
            {geo.state === "locating" ? "Locating…" : "Use my current location"}
          </button>
          <span className="text-sm text-muted">
            {geo.state === "denied"
              ? "Location blocked — browsing all areas. Filter by parish anytime."
              : geo.state === "unsupported"
                ? "Location isn't available here — browse by parish."
                : "See homes near you, sorted by distance and deal score."}
          </span>
        </div>
      )}
      {near && (
        <div className="mb-3 flex items-center justify-between rounded-[10px] border border-success/30 bg-success/5 px-3 py-2 text-sm">
          <span className="text-success">📍 Showing homes near you, closest first.</span>
          <button className="text-muted hover:underline" onClick={() => navigate("/results")}>
            Clear
          </button>
        </div>
      )}

      {/* Mobile controls */}
      <div className="mb-3 flex items-center gap-2 lg:hidden">
        <Button variant="outline" className="flex-1" onClick={() => setFilterSheet(true)}>
          Filters
        </Button>
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => setMobileView(mobileView === "list" ? "map" : "list")}
        >
          {mobileView === "list" ? "Show map" : "Show list"}
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[260px_1fr_1.1fr]">
        {/* Filter rail (desktop) */}
        <aside className="hidden lg:block">
          <div className="sticky top-20">
            <FilterRail
              filters={filters}
              onChange={setFilters}
              affordableAvailable={affordableAvailable}
              onRequestBudget={() => navigate("/affordability")}
            />
          </div>
        </aside>

        {/* List column */}
        <section className={mobileView === "map" ? "hidden lg:block" : "block"}>
          <div className="mb-3 space-y-2">
            <SortBar sort={sort} onChange={setSort} count={listings.length} />
            {data && filters.affordableOnly && !data.affordableOnlyApplied && (
              <p className="rounded-[8px] bg-warning/10 px-3 py-2 text-xs text-warning">
                Set your budget to use Affordable-fit.{" "}
                <button className="font-semibold underline" onClick={() => navigate("/affordability")}>
                  Set budget
                </button>
              </p>
            )}
          </div>

          <div className="space-y-3" aria-busy={isFetching}>
            {isLoading && [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-36" />)}
            {isError && <ErrorState onRetry={() => void refetch()} />}
            {data && listings.length === 0 && (
              <EmptyState title="Here's what changes your options" icon="🧭">
                {searchAsMove ? (
                  <>
                    No homes in this map area.{" "}
                    <button
                      className="font-semibold text-primary underline"
                      onClick={() => setSearchAsMove(false)}
                    >
                      Expand the search radius
                    </button>{" "}
                    or pan the map.
                  </>
                ) : (
                  <>
                    Try widening your price range, dropping a filter, or{" "}
                    <button
                      className="font-semibold text-primary underline"
                      onClick={() => navigate("/affordability")}
                    >
                      adjusting your budget
                    </button>
                    .
                  </>
                )}
              </EmptyState>
            )}
            {listings.map((item) => (
              <ListingCard
                key={item.id}
                item={item}
                active={hoveredId === item.id}
                onHover={setHoveredId}
              />
            ))}
          </div>
        </section>

        {/* Map column */}
        <section
          className={
            (mobileView === "list" ? "hidden lg:block " : "block ") +
            "h-[60vh] lg:sticky lg:top-20 lg:h-[calc(100vh-6rem)]"
          }
        >
          <div className="mb-2 flex items-center justify-end">
            <label className="flex items-center gap-2 rounded-pill bg-white px-3 py-1.5 text-xs shadow-card">
              <input
                type="checkbox"
                className="h-3.5 w-3.5 accent-primary"
                checked={searchAsMove}
                onChange={(e) => setSearchAsMove(e.target.checked)}
              />
              Search this area as I move the map
            </label>
          </div>
          <div className="h-[calc(100%-2.5rem)]">
            <MapPanel
              items={listings}
              hoveredId={hoveredId}
              onHover={setHoveredId}
              onMoveEnd={(b) => searchAsMove && setBbox(b)}
            />
          </div>
        </section>
      </div>

      {/* Mobile filter sheet */}
      <Sheet open={filterSheet} onClose={() => setFilterSheet(false)} title="Filters" side="bottom">
        <FilterRail
          filters={filters}
          onChange={setFilters}
          affordableAvailable={affordableAvailable}
          onRequestBudget={() => {
            setFilterSheet(false);
            navigate("/affordability");
          }}
        />
        <Button className="mt-4 w-full" onClick={() => setFilterSheet(false)}>
          Show {listings.length} homes
        </Button>
      </Sheet>
    </div>
  );
}
