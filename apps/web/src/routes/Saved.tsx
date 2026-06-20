import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { money, relativeDays } from "../lib/format";
import { Button, Card, EmptyState, Pill, Skeleton } from "../components/ui";
import { DealScoreBadge, TrustBadge } from "../components/badges";

const SENSITIVITY_LABEL: Record<string, string> = {
  passive: "Passive",
  balanced: "Balanced",
  aggressive: "Aggressive",
};

export function Saved() {
  const qc = useQueryClient();
  const savedQuery = useQuery({ queryKey: ["saved"], queryFn: api.saved });
  const alertsQuery = useQuery({ queryKey: ["alerts"], queryFn: api.alerts });

  const checkMut = useMutation({
    mutationFn: api.checkWatchdog,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["alerts"] });
      void qc.invalidateQueries({ queryKey: ["alerts", "nav"] });
    },
  });
  const readMut = useMutation({
    mutationFn: (alertId: string) => api.markAlertRead(alertId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["alerts"] });
      void qc.invalidateQueries({ queryKey: ["alerts", "nav"] });
    },
  });

  const items = savedQuery.data?.items ?? [];
  const alerts = alertsQuery.data?.alerts ?? [];

  return (
    <div className="mx-auto max-w-[1000px] px-4 py-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-3xl font-bold">Saved &amp; Watchdog</h1>
        <Button
          variant="outline"
          onClick={() => checkMut.mutate()}
          disabled={checkMut.isPending}
          title="Re-run the watchdog now (normally runs automatically every 15 minutes)"
        >
          {checkMut.isPending ? "Checking…" : "Check signals now"}
        </Button>
      </div>

      {/* Strike alerts */}
      <section className="mb-8">
        <h2 className="mb-3 font-display text-lg font-semibold">Strike alerts</h2>
        {alertsQuery.isLoading ? (
          <Skeleton className="h-20" />
        ) : alerts.length === 0 ? (
          <EmptyState title="No alerts yet" icon="🔔">
            When a watched home crosses one of your thresholds, the watchdog will ping you here.
          </EmptyState>
        ) : (
          <div className="space-y-2">
            {alerts.map((a) => (
              <Card
                key={a.id}
                className={"flex items-start gap-3 p-3 " + (a.readAt ? "opacity-60" : "")}
              >
                <span className="text-xl" aria-hidden="true">
                  {a.trigger === "new_price_cut" ? "📉" : "⏳"}
                </span>
                <div className="flex-1">
                  <p className="text-sm text-ink">{a.message}</p>
                  <p className="text-xs text-muted">{relativeDays(daysSince(a.sentAt))}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Link to={`/listing/${a.listingId}`} className="text-xs font-medium text-primary hover:underline">
                    View →
                  </Link>
                  {!a.readAt && (
                    <button
                      className="text-xs text-muted hover:underline"
                      onClick={() => readMut.mutate(a.id)}
                    >
                      Mark read
                    </button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Saved listings */}
      <section>
        <h2 className="mb-3 font-display text-lg font-semibold">Watching</h2>
        {savedQuery.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        ) : items.length === 0 ? (
          <EmptyState title="Nothing saved yet" icon="♥">
            Open a listing and tap “Save this home” to start watching it.{" "}
            <Link to="/results" className="font-semibold text-primary underline">
              Browse homes
            </Link>
          </EmptyState>
        ) : (
          <div className="space-y-2">
            {items.map(({ saved, listing }) => (
              <Card key={saved.id} className="flex items-center gap-3 p-3">
                <img
                  src={listing.images[0]}
                  alt=""
                  className="h-16 w-20 flex-shrink-0 rounded-[8px] object-cover"
                />
                <div className="min-w-0 flex-1">
                  <Link to={`/listing/${listing.id}`} className="block truncate font-medium text-ink hover:underline">
                    {listing.title}
                  </Link>
                  <p className="truncate text-xs text-muted">
                    {money(listing.price)} · {listing.region}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <DealScoreBadge score={listing.dealScore} />
                    <TrustBadge tier={listing.verificationTier} />
                    {saved.watchdogEnabled ? (
                      <Pill tone="accent">👁 Watching · {SENSITIVITY_LABEL[saved.sensitivity]}</Pill>
                    ) : (
                      <Pill>Not watched</Pill>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function daysSince(iso: string): number {
  return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 86400_000));
}
