import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { OfferDraft as OfferDraftType } from "@rep/shared";
import { api } from "../lib/api";
import { money } from "../lib/format";
import { useMeta } from "../lib/meta";
import { Button, Card, ErrorState, Input, Skeleton } from "../components/ui";
import { Disclaimer } from "../components/Disclaimer";

const COMMON_CONDITIONS = [
  "Subject to a clear title search",
  "Subject to satisfactory survey & boundaries",
  "Subject to financing / mortgage approval",
  "Subject to a structural inspection",
  "Subject to professional valuation",
];

export function OfferDraft() {
  const { id = "" } = useParams();
  const meta = useMeta();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["listing", id],
    queryFn: () => api.listing(id),
  });

  const initial = useMemo<OfferDraftType | null>(() => {
    if (!data) return null;
    return {
      offerPrice: data.anchors.target,
      depositPercent: 10,
      conditions: [COMMON_CONDITIONS[0]!, COMMON_CONDITIONS[2]!],
      closingTimelineDays: 60,
      inclusions: [],
      notes: "",
    };
  }, [data]);

  const [draft, setDraft] = useState<OfferDraftType | null>(null);
  const current = draft ?? initial;

  const saveMut = useMutation({
    mutationFn: (d: OfferDraftType) => api.createOffer(id, d),
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[800px] px-4 py-8">
        <Skeleton className="h-96" />
      </div>
    );
  }
  if (isError || !data || !current) {
    return (
      <div className="mx-auto max-w-[800px] px-4 py-8">
        <ErrorState onRetry={() => void refetch()} message="Couldn't load the offer." />
      </div>
    );
  }

  const { listing } = data;
  const set = (patch: Partial<OfferDraftType>) => setDraft({ ...current, ...patch });
  const toggleCondition = (c: string) =>
    set({
      conditions: current.conditions.includes(c)
        ? current.conditions.filter((x) => x !== c)
        : [...current.conditions, c],
    });

  async function exportPdf() {
    await saveMut.mutateAsync(current!);
    window.print();
  }

  return (
    <div className="mx-auto max-w-[820px] px-4 py-8">
      <div className="no-print mb-4 flex items-center justify-between">
        <Link to={`/listing/${id}`} className="text-sm text-primary hover:underline">
          ← Back to listing
        </Link>
        <span className="text-sm font-semibold text-ink">Offer drafter</span>
      </div>

      {/* Editable form (hidden when printing) */}
      <Card className="no-print space-y-5 p-5">
        <div>
          <h1 className="font-display text-2xl font-bold">Draft your offer</h1>
          <p className="text-sm text-muted">
            {listing.title} · {listing.address}
          </p>
        </div>

        <label className="block">
          <span className="mb-1 block text-sm font-medium">Offer price</span>
          <Input
            type="number"
            inputMode="numeric"
            value={current.offerPrice}
            onChange={(e) => set({ offerPrice: Number(e.target.value) || 0 })}
          />
          <span className="mt-1 block text-xs text-muted">
            Asking {money(listing.price)} · Coach target {money(data.anchors.target)} · open{" "}
            {money(data.anchors.open)} · walk {money(data.anchors.walk)}
          </span>
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Deposit (%)</span>
            <Input
              type="number"
              min={0}
              max={100}
              value={current.depositPercent}
              onChange={(e) => set({ depositPercent: Number(e.target.value) || 0 })}
            />
            <span className="mt-1 block text-xs text-muted">
              ≈ {money((current.offerPrice * current.depositPercent) / 100)}
            </span>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Closing timeline (days)</span>
            <Input
              type="number"
              min={1}
              value={current.closingTimelineDays}
              onChange={(e) => set({ closingTimelineDays: Number(e.target.value) || 0 })}
            />
          </label>
        </div>

        <fieldset>
          <legend className="mb-2 text-sm font-medium">Conditions / contingencies</legend>
          <div className="space-y-2">
            {COMMON_CONDITIONS.map((c) => (
              <label key={c} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-primary"
                  checked={current.conditions.includes(c)}
                  onChange={() => toggleCondition(c)}
                />
                {c}
              </label>
            ))}
          </div>
        </fieldset>

        <label className="block">
          <span className="mb-1 block text-sm font-medium">Requested inclusions</span>
          <Input
            placeholder="e.g. appliances, water tank, drapes (comma-separated)"
            value={current.inclusions.join(", ")}
            onChange={(e) =>
              set({ inclusions: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })
            }
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium">Notes to the seller</span>
          <textarea
            className="w-full rounded-[10px] border border-border bg-white px-3 py-2.5 text-sm focus:border-primary"
            rows={3}
            value={current.notes}
            onChange={(e) => set({ notes: e.target.value })}
          />
        </label>

        <Disclaimer which="offer" />

        <div className="flex flex-wrap gap-2">
          <Button variant="cta" onClick={exportPdf} disabled={saveMut.isPending}>
            Export draft to PDF
          </Button>
          <Button variant="outline" onClick={() => saveMut.mutate(current)} disabled={saveMut.isPending}>
            Save draft
          </Button>
        </div>
        {saveMut.isSuccess && (
          <p className="text-sm text-success">
            Draft saved. This is a starting point — review with a licensed agent or attorney before
            submitting. It cannot be submitted through this app.
          </p>
        )}
      </Card>

      {/* Print-optimized document */}
      <div className="print-page mt-6 rounded-[12px] border border-border bg-white p-8 print:mt-0 print:border-0">
        <header className="mb-6 border-b border-border pb-4">
          <h2 className="font-display text-2xl font-bold">Letter of Intent — Draft Offer</h2>
          <p className="text-sm text-muted">
            Prepared {new Date().toLocaleDateString(meta.marketConfig.locale)} · Not a binding offer
          </p>
        </header>

        <section className="space-y-1 text-sm">
          <Line label="Property" value={`${listing.title}, ${listing.address}, ${listing.region}`} />
          <Line label="Asking price" value={money(listing.price)} />
          <Line label="Offer price" value={money(current.offerPrice)} />
          <Line
            label="Deposit"
            value={`${current.depositPercent}% (≈ ${money((current.offerPrice * current.depositPercent) / 100)})`}
          />
          <Line label="Closing timeline" value={`${current.closingTimelineDays} days`} />
          {current.inclusions.length > 0 && (
            <Line label="Requested inclusions" value={current.inclusions.join(", ")} />
          )}
        </section>

        <section className="mt-4">
          <h3 className="mb-1 text-sm font-semibold">Conditions</h3>
          <ul className="list-inside list-disc text-sm">
            {current.conditions.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </section>

        {current.notes && (
          <section className="mt-4">
            <h3 className="mb-1 text-sm font-semibold">Notes</h3>
            <p className="text-sm">{current.notes}</p>
          </section>
        )}

        <footer className="mt-8 border-t border-border pt-4 text-xs text-muted">
          This draft is for discussion only and is not a binding offer or legal document. Estimates and
          starting points only. Have a licensed agent or attorney review and submit any offer.
          (Disclaimer version {meta.disclaimerVersion})
        </footer>
      </div>
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="w-40 flex-shrink-0 font-medium text-muted">{label}</span>
      <span className="text-ink">{value}</span>
    </div>
  );
}
