import { cn } from "../lib/format";

const OPTIONS: { key: string; label: string }[] = [
  { key: "recommended", label: "Recommended" },
  { key: "price", label: "Price" },
  { key: "newest", label: "Newest" },
  { key: "deal_score", label: "Deal Score" },
  { key: "days_on_market", label: "Days on market" },
];

export function SortBar({
  sort,
  onChange,
  count,
}: {
  sort: string;
  onChange: (key: string) => void;
  count: number;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-sm text-muted" aria-live="polite">
        <span className="font-semibold text-ink tnum">{count}</span> homes
      </p>
      <div className="flex items-center gap-1 overflow-x-auto" role="group" aria-label="Sort listings">
        <span className="hidden text-xs text-muted sm:inline">Sort:</span>
        {OPTIONS.map((o) => (
          <button
            key={o.key}
            onClick={() => onChange(o.key)}
            aria-pressed={sort === o.key}
            className={cn(
              "whitespace-nowrap rounded-pill px-3 py-1.5 text-xs font-medium transition",
              sort === o.key ? "bg-primary text-white" : "bg-white text-muted hover:bg-canvas",
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
