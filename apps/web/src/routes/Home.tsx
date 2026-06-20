import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useMeta } from "../lib/meta";
import { useGeolocation } from "../lib/useGeolocation";
import { Button, Card, Input, Select, Skeleton } from "../components/ui";
import { ListingCard } from "../components/ListingCard";

export function Home() {
  const meta = useMeta();
  const navigate = useNavigate();
  const geo = useGeolocation();
  const [where, setWhere] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [type, setType] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["featured"],
    queryFn: () => api.search({ sort: "recommended" }),
  });
  const featured = (data?.listings ?? []).filter((l) => l.verificationTier >= 2).slice(0, 3);

  function runSearch() {
    const params = new URLSearchParams();
    if (where) params.set("region", where);
    if (maxPrice) params.set("maxPrice", maxPrice);
    if (type) params.set("type", type);
    navigate(`/results?${params.toString()}`);
  }

  async function useMyLocation() {
    const c = await geo.request();
    if (c) navigate(`/results?near=${c.lng},${c.lat}`);
  }

  return (
    <div>
      {/* Hero band */}
      <section className="relative bg-primary pb-24 pt-12 text-white">
        <div className="mx-auto max-w-[1100px] px-4">
          <h1 className="font-display text-3xl font-bold leading-tight sm:text-4xl">
            See your real options. Know when to strike. Don't get scammed.
          </h1>
          <p className="mt-3 max-w-2xl text-white/85">
            Strikepoint shows first-time buyers in Jamaica only what they can actually afford, coaches your
            offer with live market signals, and ranks verified listings first.
          </p>
        </div>
      </section>

      {/* Hero search pill-row, overlapping the band */}
      <div className="mx-auto -mt-16 max-w-[1100px] px-4">
        <Card className="p-3">
          <div className="grid gap-2 md:grid-cols-[1.4fr_1fr_1fr_auto]">
            <label className="flex flex-col">
              <span className="px-1 text-[11px] font-semibold uppercase tracking-wide text-muted">
                Where
              </span>
              <Input
                placeholder={`Parish or area (e.g. Kingston)`}
                value={where}
                onChange={(e) => setWhere(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && runSearch()}
                aria-label="Location"
              />
            </label>
            <label className="flex flex-col">
              <span className="px-1 text-[11px] font-semibold uppercase tracking-wide text-muted">
                Max budget
              </span>
              <Input
                type="number"
                inputMode="numeric"
                placeholder={`${meta.marketConfig.currencySymbol} max`}
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                aria-label="Maximum budget"
              />
            </label>
            <label className="flex flex-col">
              <span className="px-1 text-[11px] font-semibold uppercase tracking-wide text-muted">
                Type
              </span>
              <Select value={type} onChange={(e) => setType(e.target.value)} aria-label="Property type">
                <option value="">Any type</option>
                <option value="house">House</option>
                <option value="apartment">Apartment</option>
                <option value="townhouse">Townhouse</option>
                <option value="land">Land</option>
              </Select>
            </label>
            <div className="flex items-end">
              <Button variant="cta" className="h-[42px] w-full px-6 md:w-auto" onClick={runSearch}>
                Search
              </Button>
            </div>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2 px-1">
            <button
              onClick={useMyLocation}
              className="inline-flex items-center gap-1.5 rounded-pill bg-accent/10 px-3 py-1.5 text-sm font-medium text-accent hover:bg-accent/20"
            >
              <span aria-hidden="true">📍</span>
              {geo.state === "locating" ? "Locating…" : "Use my current location"}
            </button>
            {geo.state === "denied" && (
              <span className="text-xs text-muted">
                Location blocked — search by parish above instead.
              </span>
            )}
            <Link to="/affordability" className="text-sm font-medium text-primary hover:underline">
              Set your budget →
            </Link>
          </div>
        </Card>
      </div>

      {/* Featured verified listings (lead pillar for first-time buyers: trust + affordability) */}
      <section className="mx-auto max-w-[1100px] px-4 py-12">
        <div className="mb-4 flex items-end justify-between">
          <h2 className="font-display text-xl font-bold">Verified homes, ranked first</h2>
          <Link to="/results" className="text-sm font-medium text-primary hover:underline">
            Browse all →
          </Link>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {isLoading
            ? [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-36" />)
            : featured.map((item) => <ListingCard key={item.id} item={item} />)}
        </div>
      </section>
    </div>
  );
}
