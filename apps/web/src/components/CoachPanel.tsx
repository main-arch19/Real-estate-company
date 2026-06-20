import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { money } from "../lib/format";
import { Button, Card, ErrorState, Pill, Skeleton } from "./ui";
import { DealScoreBadge } from "./badges";
import { Disclaimer } from "./Disclaimer";

/**
 * AI Negotiation Coach panel. Warm, not manipulative. Shows the leverage read,
 * Deal Score, suggested offer band with reasoning, and a persistent "not advice"
 * disclaimer. Degrades honestly when comps are unavailable.
 */
export function CoachPanel({ listingId }: { listingId: string }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["coach", listingId],
    queryFn: () => api.coach(listingId),
  });

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between bg-primary px-4 py-3 text-white">
        <h2 className="flex items-center gap-2 font-display text-base font-semibold">
          <span aria-hidden="true">🤝</span> Negotiation Coach
        </h2>
        {data && (
          <Pill className="bg-white/15 text-white">
            {data.coach.source === "claude" ? "AI read" : "Signal-based read"}
          </Pill>
        )}
      </div>

      <div className="space-y-4 p-4">
        {isLoading && (
          <div className="space-y-3">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-16 w-full" />
            <div className="grid grid-cols-3 gap-2">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
          </div>
        )}

        {isError && <ErrorState onRetry={() => void refetch()} message="Couldn't load the coach." />}

        {data && (
          <>
            <div className="flex items-start gap-3">
              <DealScoreBadge score={data.dealScore} size="lg" />
            </div>

            <p className="text-sm font-medium leading-relaxed text-ink">{data.coach.headline}</p>

            {!data.coach.compsAvailable && (
              <p className="rounded-[8px] bg-canvas px-3 py-2 text-xs text-muted">
                Comparable sales aren't available in this market, so this read is based on days-on-market
                and price cuts only — not a valuation.
              </p>
            )}

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                Suggested offer band
              </p>
              <div className="grid grid-cols-3 gap-2">
                <BandCell label="Open" amount={data.coach.band.open} tone="accent" reasoning={data.coach.band.openReasoning} />
                <BandCell label="Target" amount={data.coach.band.target} tone="success" reasoning={data.coach.band.targetReasoning} />
                <BandCell label="Walk" amount={data.coach.band.walk} tone="warning" reasoning={data.coach.band.walkReasoning} />
              </div>
            </div>

            {data.coach.notes.length > 0 && (
              <ul className="space-y-1.5">
                {data.coach.notes.map((n, i) => (
                  <li key={i} className="flex gap-2 text-sm text-ink">
                    <span className="text-cta" aria-hidden="true">
                      •
                    </span>
                    {n}
                  </li>
                ))}
              </ul>
            )}

            <Button
              variant="cta"
              className="w-full"
              onClick={() =>
                user ? navigate(`/offer/${listingId}`) : navigate("/auth", { state: { from: `/offer/${listingId}` } })
              }
            >
              Draft an offer →
            </Button>

            <Disclaimer which="coach" />
          </>
        )}
      </div>
    </Card>
  );
}

function BandCell({
  label,
  amount,
  tone,
  reasoning,
}: {
  label: string;
  amount: number;
  tone: "accent" | "success" | "warning";
  reasoning: string;
}) {
  const toneClass =
    tone === "success" ? "text-success" : tone === "warning" ? "text-warning" : "text-accent";
  return (
    <div className="rounded-[10px] border border-border p-2.5" title={reasoning}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className={`tnum text-sm font-bold ${toneClass}`}>{money(amount)}</p>
      <p className="mt-1 line-clamp-3 text-[11px] leading-snug text-muted">{reasoning}</p>
    </div>
  );
}
