import { Link } from "react-router-dom";
import type { ScoredListing, TrueMonthlyCost } from "@rep/shared";
import { DealScoreBadge, AffordableFitBadge, TrustBadge } from "./badges";
import { Pill } from "./ui";
import { cn, money, pct, relativeDays } from "../lib/format";

export interface ListingCardData extends ScoredListing {
  monthly?: TrueMonthlyCost;
}

export function ListingCard({
  item,
  active,
  onHover,
}: {
  item: ListingCardData;
  active?: boolean;
  onHover?: (id: string | null) => void;
}) {
  const cut = item.signals.priceCutCount > 0;
  return (
    <Link
      to={`/listing/${item.id}`}
      onMouseEnter={() => onHover?.(item.id)}
      onMouseLeave={() => onHover?.(null)}
      onFocus={() => onHover?.(item.id)}
      onBlur={() => onHover?.(null)}
      className={cn(
        "block overflow-hidden rounded-[12px] border bg-surface shadow-card transition focus:outline-none",
        active ? "border-primary ring-2 ring-primary/30" : "border-border hover:shadow-lift",
      )}
    >
      <div className="flex">
        <div className="relative h-36 w-44 flex-shrink-0 bg-canvas">
          <img
            src={item.images[0]}
            alt={item.title}
            loading="lazy"
            className="h-full w-full object-cover"
          />
          <div className="absolute left-2 top-2">
            <DealScoreBadge score={item.dealScore} />
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-1.5 p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="tnum font-display text-lg font-bold text-ink">{money(item.price)}</div>
            <TrustBadge tier={item.verificationTier} />
          </div>

          <div className="truncate text-sm font-medium text-ink">{item.title}</div>
          <div className="truncate text-xs text-muted">
            {item.address} · {item.region}
          </div>

          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted">
            {item.type !== "land" && (
              <span>
                {item.beds} bd · {item.baths} ba
              </span>
            )}
            {item.areaSqft ? <span>· {item.areaSqft.toLocaleString()} sqft</span> : null}
            <span>· listed {relativeDays(item.signals.daysOnMarket)}</span>
          </div>

          <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-1">
            {cut && (
              <Pill tone="warning">
                ↓ {item.signals.priceCutCount}× cut · −{pct(item.signals.totalPriceCutPct)}
              </Pill>
            )}
            {item.distanceKm !== undefined && <Pill tone="neutral">{item.distanceKm} km away</Pill>}
            {item.monthly && (
              <AffordableFitBadge
                monthlyLabel={money(item.monthly.total)}
                withinBudget={item.monthly.withinBudget}
              />
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
