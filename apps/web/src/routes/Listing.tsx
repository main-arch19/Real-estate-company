import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { WatchSensitivity } from "@rep/shared";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { money, pct, relativeDays } from "../lib/format";
import { Button, Card, ErrorState, Pill, Select, Sheet, Skeleton } from "../components/ui";
import { DealScoreBadge, TrustBadge } from "../components/badges";
import { CoachPanel } from "../components/CoachPanel";
import { Disclaimer } from "../components/Disclaimer";
import { ScamEducation } from "../components/ScamEducation";

export function Listing() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [activeImg, setActiveImg] = useState(0);
  const [reportOpen, setReportOpen] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["listing", id],
    queryFn: () => api.listing(id),
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[1100px] px-4 py-6">
        <Skeleton className="h-80 w-full" />
        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_380px]">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }
  if (isError || !data) {
    return (
      <div className="mx-auto max-w-[1100px] px-4 py-6">
        <ErrorState onRetry={() => void refetch()} message="Couldn't load this listing." />
      </div>
    );
  }

  const { listing, verification, monthly, priceHistory, saved } = data;

  return (
    <div className="mx-auto max-w-[1100px] px-4 py-6">
      <Link to="/results" className="mb-3 inline-block text-sm text-primary hover:underline">
        ← Back to results
      </Link>

      {/* Gallery */}
      <div className="grid gap-2 sm:grid-cols-[2fr_1fr]">
        <div className="overflow-hidden rounded-[12px] bg-canvas">
          <img
            src={listing.images[activeImg]}
            alt={`${listing.title} — photo ${activeImg + 1}`}
            className="h-80 w-full object-cover"
          />
        </div>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-1">
          {listing.images.map((src, i) => (
            <button
              key={src}
              onClick={() => setActiveImg(i)}
              aria-label={`Show photo ${i + 1}`}
              aria-pressed={i === activeImg}
              className={
                "overflow-hidden rounded-[10px] " +
                (i === activeImg ? "ring-2 ring-primary" : "opacity-80 hover:opacity-100")
              }
            >
              <img src={src} alt="" className="h-24 w-full object-cover sm:h-[5.5rem]" />
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_380px]">
        {/* Main column */}
        <div className="space-y-5">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="tnum font-display text-3xl font-bold">{money(listing.price)}</h1>
              <DealScoreBadge score={listing.dealScore} size="lg" />
              <TrustBadge tier={listing.verificationTier} breakdown={verification} />
            </div>
            <h2 className="mt-1 text-lg font-medium text-ink">{listing.title}</h2>
            <p className="text-sm text-muted">
              {listing.address} · {listing.region}
            </p>
            <div className="mt-2 flex flex-wrap gap-2 text-sm text-muted">
              {listing.type !== "land" && (
                <Pill>
                  {listing.beds} beds · {listing.baths} baths
                </Pill>
              )}
              {listing.areaSqft && <Pill>{listing.areaSqft.toLocaleString()} sqft</Pill>}
              <Pill>Listed {relativeDays(listing.signals.daysOnMarket)}</Pill>
              {listing.signals.priceCutCount > 0 && (
                <Pill tone="warning">
                  ↓ {listing.signals.priceCutCount}× cut · −{pct(listing.signals.totalPriceCutPct)}
                </Pill>
              )}
            </div>
          </div>

          <p className="text-sm leading-relaxed text-ink">{listing.description}</p>

          {/* Scam education — prominent when unverified */}
          <ScamEducation prominent={listing.verificationTier === 0} />

          {/* Verification panel */}
          <Card className="p-4">
            <h3 className="mb-3 font-display text-lg font-semibold">Scam-Shield verification</h3>
            <ul className="space-y-2">
              {verification.map((v) => (
                <li key={v.tier} className="flex items-start gap-3 text-sm">
                  <span aria-hidden="true">{v.achieved ? "✅" : "⬜"}</span>
                  <div>
                    <p className={v.achieved ? "font-medium text-ink" : "text-muted"}>{v.label}</p>
                    {v.achieved && v.verifiedAt && (
                      <p className="text-xs text-muted">
                        Verified {relativeDays(daysSince(v.verifiedAt))}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-3">
              <Disclaimer which="verification" />
            </div>
            <button
              onClick={() => setReportOpen(true)}
              className="mt-3 text-sm font-medium text-danger hover:underline"
            >
              ⚐ Report this listing
            </button>
          </Card>

          {/* Price history */}
          {priceHistory.length > 1 && (
            <Card className="p-4">
              <h3 className="mb-3 font-display text-lg font-semibold">Price history</h3>
              <ul className="space-y-1.5 text-sm">
                {priceHistory.map((p, i) => {
                  const prev = priceHistory[i - 1]?.price;
                  const down = prev != null && p.price < prev;
                  return (
                    <li key={p.id} className="flex items-center justify-between">
                      <span className="text-muted">{relativeDays(daysSince(p.changedAt))}</span>
                      <span className={"tnum font-medium " + (down ? "text-warning" : "text-ink")}>
                        {money(p.price)} {down ? "↓" : i === 0 ? "(listed)" : ""}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}

          {/* True monthly cost / affordability */}
          <Card className="p-4">
            <h3 className="mb-1 font-display text-lg font-semibold">What you'd really pay</h3>
            {monthly ? (
              <>
                <div className="mb-3 flex items-baseline gap-2">
                  <span className="tnum text-2xl font-bold text-ink">{money(monthly.total)}</span>
                  <span className="text-sm text-muted">/ month, all-in</span>
                  <span
                    className={
                      "ml-auto rounded-pill px-2.5 py-1 text-xs font-medium " +
                      (monthly.withinBudget
                        ? "bg-success/10 text-success"
                        : "bg-warning/10 text-warning")
                    }
                  >
                    {monthly.withinBudget ? "✓ within budget" : "↑ above budget"}
                  </span>
                </div>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                  <CostRow label="Principal & interest" value={monthly.principalAndInterest} />
                  <CostRow label="Property tax" value={monthly.propertyTax} />
                  <CostRow label="Insurance" value={monthly.insurance} />
                  {monthly.strata > 0 && <CostRow label="Strata / HOA" value={monthly.strata} />}
                  {monthly.mortgageInsurance > 0 && (
                    <CostRow label="Mortgage insurance" value={monthly.mortgageInsurance} />
                  )}
                </dl>
                {monthly.oneOffFees.length > 0 && (
                  <div className="mt-3 rounded-[8px] bg-canvas p-3">
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
                      One-off purchase costs (paid at closing, not monthly)
                    </p>
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                      {monthly.oneOffFees.map((f) => (
                        <CostRow key={f.label} label={f.label} value={f.amount} />
                      ))}
                      <CostRow label="Total upfront fees" value={monthly.oneOffFeesTotal} bold />
                    </dl>
                  </div>
                )}
                <div className="mt-3">
                  <Disclaimer which="affordability" />
                </div>
              </>
            ) : (
              <div>
                <p className="text-sm text-muted">
                  Set your budget to see principal &amp; interest, taxes, insurance, strata and stamp duty
                  for this exact home — and whether it fits.
                </p>
                <Button variant="outline" className="mt-3" onClick={() => navigate("/affordability")}>
                  Set your budget →
                </Button>
              </div>
            )}
          </Card>
        </div>

        {/* Sidebar: Coach + Save/Watchdog */}
        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <SaveCard listingId={id} initial={saved} loggedIn={Boolean(user)} onChange={() => qc.invalidateQueries({ queryKey: ["listing", id] })} />
          <CoachPanel listingId={id} />
        </aside>
      </div>

      <ReportSheet open={reportOpen} onClose={() => setReportOpen(false)} listingId={id} />
    </div>
  );
}

function CostRow({ label, value, bold }: { label: string; value: number; bold?: boolean }) {
  return (
    <>
      <dt className={"text-muted " + (bold ? "font-semibold" : "")}>{label}</dt>
      <dd className={"tnum text-right " + (bold ? "font-semibold text-ink" : "text-ink")}>
        {money(value)}
      </dd>
    </>
  );
}

function SaveCard({
  listingId,
  initial,
  loggedIn,
  onChange,
}: {
  listingId: string;
  initial?: { watchdogEnabled: boolean; sensitivity: WatchSensitivity } | undefined;
  loggedIn: boolean;
  onChange: () => void;
}) {
  const navigate = useNavigate();
  const [watch, setWatch] = useState(initial?.watchdogEnabled ?? true);
  const [sensitivity, setSensitivity] = useState<WatchSensitivity>(initial?.sensitivity ?? "balanced");
  const isSaved = Boolean(initial);

  const saveMut = useMutation({
    mutationFn: () => api.save(listingId, watch, sensitivity),
    onSuccess: onChange,
  });
  const unsaveMut = useMutation({
    mutationFn: () => api.unsave(listingId),
    onSuccess: onChange,
  });

  if (!loggedIn) {
    return (
      <Card className="p-4">
        <p className="text-sm text-muted">Sign in to save this home and arm the watchdog.</p>
        <Button
          className="mt-3 w-full"
          onClick={() => navigate("/auth", { state: { from: `/listing/${listingId}` } })}
        >
          Sign in to save
        </Button>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <h3 className="mb-2 font-display text-lg font-semibold">
        {isSaved ? "Saved" : "Save & watch"}
      </h3>
      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4 accent-cta"
          checked={watch}
          onChange={(e) => setWatch(e.target.checked)}
        />
        <span className="text-sm">
          <span className="font-medium text-ink">Watch this for the right moment</span>
          <span className="block text-xs text-muted">
            We re-check the signals and ping you when the data says strike.
          </span>
        </span>
      </label>

      {watch && (
        <label className="mt-3 block">
          <span className="mb-1 block text-xs font-semibold text-muted">Sensitivity</span>
          <Select
            value={sensitivity}
            onChange={(e) => setSensitivity(e.target.value as WatchSensitivity)}
          >
            <option value="passive">Passive — only big moves</option>
            <option value="balanced">Balanced</option>
            <option value="aggressive">Aggressive — every signal</option>
          </Select>
        </label>
      )}

      <Button className="mt-4 w-full" variant="cta" onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
        {isSaved ? "Update watch" : "Save this home"}
      </Button>
      {isSaved && (
        <button
          className="mt-2 w-full text-center text-sm text-muted hover:underline"
          onClick={() => unsaveMut.mutate()}
        >
          Remove from saved
        </button>
      )}
    </Card>
  );
}

function ReportSheet({
  open,
  onClose,
  listingId,
}: {
  open: boolean;
  onClose: () => void;
  listingId: string;
}) {
  const [reason, setReason] = useState("Suspected fake / scam listing");
  const [detail, setDetail] = useState("");
  const [done, setDone] = useState(false);
  const mut = useMutation({
    mutationFn: () => api.report(listingId, reason, detail || undefined),
    onSuccess: () => setDone(true),
  });

  return (
    <Sheet open={open} onClose={onClose} title="Report this listing">
      {done ? (
        <div className="text-center">
          <div className="mb-2 text-3xl" aria-hidden="true">
            ✅
          </div>
          <p className="text-sm text-ink">
            Thanks — this listing has been sent to our moderation queue for review.
          </p>
          <Button className="mt-4" onClick={onClose}>
            Done
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-sm font-medium">What's wrong?</span>
            <Select value={reason} onChange={(e) => setReason(e.target.value)}>
              <option>Suspected fake / scam listing</option>
              <option>Possible double-selling</option>
              <option>Capture / squatter land concern</option>
              <option>Wrong or misleading details</option>
              <option>Already sold</option>
            </Select>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Details (optional)</span>
            <textarea
              className="w-full rounded-[10px] border border-border bg-white px-3 py-2.5 text-sm focus:border-primary"
              rows={4}
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
            />
          </label>
          <Button variant="danger" className="w-full" onClick={() => mut.mutate()} disabled={mut.isPending}>
            Submit report
          </Button>
        </div>
      )}
    </Sheet>
  );
}

function daysSince(iso: string): number {
  return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 86400_000));
}
