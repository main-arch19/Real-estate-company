import { useState } from "react";
import { useMeta } from "../lib/meta";

const TOPIC_COPY: Record<string, { title: string; body: string }> = {
  capture_land: {
    title: "Watch for capture land",
    body: "Land someone occupies but doesn't legally own is sometimes sold as if titled. Confirm the registered title and survey diagram before any payment.",
  },
  squatter_land: {
    title: "Squatter-occupied land",
    body: "Squatter land can't be sold with clean title. Verify the registered owner at the National Land Agency before proceeding.",
  },
  double_selling: {
    title: "Avoid double-selling",
    body: "The same property is sometimes sold to more than one buyer. Use an attorney and lodge your transaction promptly to protect your claim.",
  },
  fake_listing: {
    title: "Spot fake listings",
    body: "Scam listings reuse real photos to collect deposits. Never pay before verifying the seller's identity and viewing in person.",
  },
};

/**
 * Contextual scam education — surfaced inline (not a wall of text). On
 * unverified listings it's prominent; elsewhere it's a collapsible primer.
 */
export function ScamEducation({ prominent = false }: { prominent?: boolean }) {
  const meta = useMeta();
  const [open, setOpen] = useState(prominent);
  const topics = meta.marketConfig.scamTopics
    .map((t) => TOPIC_COPY[t])
    .filter((x): x is { title: string; body: string } => Boolean(x));

  if (topics.length === 0) return null;

  return (
    <div
      className={
        "rounded-[10px] border p-3 " +
        (prominent ? "border-danger/30 bg-danger/5" : "border-border bg-canvas")
      }
    >
      <button
        type="button"
        className="flex w-full items-center justify-between text-left"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-ink">
          <span aria-hidden="true">{prominent ? "⚠️" : "🛟"}</span>
          {prominent ? "Before you pay anything, read this" : "Buyer safety in this market"}
        </span>
        <span className="text-muted" aria-hidden="true">
          {open ? "−" : "+"}
        </span>
      </button>
      {open && (
        <ul className="mt-3 space-y-3">
          {topics.map((t) => (
            <li key={t.title} className="text-xs">
              <p className="font-semibold text-ink">{t.title}</p>
              <p className="text-muted">{t.body}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
