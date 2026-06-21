import { useState } from "react";

/**
 * Honest labeling for the static Vercel build: sample data, in-browser
 * persistence, and a signal-based (non-AI) Coach. Dismissable per browser.
 */
export function DemoBanner() {
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem("demo.banner.dismissed") === "1",
  );
  if (dismissed) return null;
  return (
    <div className="no-print bg-cta/15 text-ink">
      <div className="mx-auto flex max-w-[1400px] items-center gap-3 px-4 py-2 text-xs sm:text-sm">
        <span aria-hidden="true">🧪</span>
        <p className="flex-1">
          <span className="font-semibold">Demo mode.</span> Sample Jamaica listings, saved to your
          browser only. The Negotiation Coach runs on market signals (no live AI in this build), and
          nothing is submitted anywhere — these are estimates, not advice.
        </p>
        <button
          className="rounded-pill px-2 py-1 font-medium text-muted hover:bg-white/40"
          onClick={() => {
            localStorage.setItem("demo.banner.dismissed", "1");
            setDismissed(true);
          }}
          aria-label="Dismiss demo notice"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
