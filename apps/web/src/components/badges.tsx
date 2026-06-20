import { useState } from "react";
import type { DealScore } from "@rep/shared";
import type { VerificationTierInfo } from "../lib/types";
import { cn } from "../lib/format";

/** Deal Score badge (0–100) — color + icon + label, never color alone. */
export function DealScoreBadge({ score, size = "sm" }: { score: DealScore; size?: "sm" | "lg" }) {
  const tone =
    score.band === "strong"
      ? "bg-success text-white"
      : score.band === "moderate"
        ? "bg-cta text-ink"
        : "bg-muted text-white";
  const label = score.band === "strong" ? "Strong deal" : score.band === "moderate" ? "Some leverage" : "Tight";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-pill font-semibold tnum",
        tone,
        size === "lg" ? "px-3 py-1.5 text-sm" : "px-2 py-0.5 text-xs",
      )}
      title={`Deal Score ${score.score}/100 — ${label}${score.degraded ? " (comps unavailable; score based on days-on-market + price cuts)" : ""}`}
      aria-label={`Deal Score ${score.score} out of 100, ${label}`}
    >
      <span aria-hidden="true">📊</span>
      {score.score}
      {size === "lg" && <span className="font-normal">· {label}</span>}
    </span>
  );
}

/**
 * Trust Badge — verification tier with breakdown on hover/tap. Unverified
 * listings get a muted danger flag. Always pairs color with icon + label.
 */
export function TrustBadge({
  tier,
  breakdown,
}: {
  tier: number;
  breakdown?: VerificationTierInfo[];
}) {
  const [open, setOpen] = useState(false);

  if (tier === 0) {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-pill bg-danger/10 px-2.5 py-1 text-xs font-medium text-danger"
        title="Unverified — verify ownership before paying"
      >
        <span aria-hidden="true">⚠️</span> Unverified — verify before paying
      </span>
    );
  }

  const label = tier === 3 ? "Fully verified" : `Verified · Tier ${tier}`;

  return (
    <span className="relative inline-block">
      <button
        type="button"
        className="inline-flex items-center gap-1 rounded-pill bg-success/10 px-2.5 py-1 text-xs font-medium text-success"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={`${label}. Show verification details.`}
      >
        <span aria-hidden="true">🛡️</span> {label}
      </button>
      {open && breakdown && (
        <div className="absolute left-0 top-full z-20 mt-1 w-72 rounded-[10px] border border-border bg-white p-3 text-left shadow-lift">
          <p className="mb-2 text-xs font-semibold text-ink">Verification tiers</p>
          <ul className="space-y-1.5">
            {breakdown.map((b) => (
              <li key={b.tier} className="flex items-start gap-2 text-xs">
                <span aria-hidden="true">{b.achieved ? "✅" : "⬜"}</span>
                <span className={b.achieved ? "text-ink" : "text-muted"}>{b.label}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[11px] text-muted">
            Badges reduce but don't eliminate risk — always confirm title independently.
          </p>
        </div>
      )}
    </span>
  );
}

/** "≈ J$X/mo — within budget" badge shown when affordability data is present. */
export function AffordableFitBadge({
  monthlyLabel,
  withinBudget,
}: {
  monthlyLabel: string;
  withinBudget: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-pill px-2.5 py-1 text-xs font-medium tnum",
        withinBudget ? "bg-success/10 text-success" : "bg-warning/10 text-warning",
      )}
    >
      <span aria-hidden="true">{withinBudget ? "✓" : "↑"}</span>
      ≈ {monthlyLabel}/mo {withinBudget ? "— within budget" : "— above budget"}
    </span>
  );
}
