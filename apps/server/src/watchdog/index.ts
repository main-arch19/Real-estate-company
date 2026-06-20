import cron from "node-cron";
import type { AlertTrigger, SavedListing, WatchSensitivity } from "@rep/shared";
import { formatMoney } from "@rep/shared";
import { providers } from "../providers/index.js";
import { store } from "../store/memory.js";
import { scoreListing } from "../services/listings.js";

/**
 * Watchdog agent. A scheduled job re-checks signals on every watched (saved)
 * listing; when a sensitivity-dependent threshold crosses, it writes an alert
 * ("This place just dropped again — the data says move.").
 *
 * Sensitivity controls how eagerly it fires.
 */
const DOM_THRESHOLD: Record<WatchSensitivity, number> = {
  passive: 150,
  balanced: 90,
  aggressive: 45,
};
const MIN_CUT_PCT: Record<WatchSensitivity, number> = {
  passive: 0.05,
  balanced: 0.02,
  aggressive: 0,
};

interface PendingAlert {
  trigger: AlertTrigger;
  message: string;
}

function alreadyAlerted(userId: string, listingId: string, trigger: AlertTrigger): boolean {
  return store
    .alertsForUser(userId)
    .some((a) => a.listingId === listingId && a.trigger === trigger);
}

function evaluate(saved: SavedListing): PendingAlert[] {
  const listing = providers.listing.byId(saved.listingId);
  if (!listing) return [];
  const scored = scoreListing(listing);
  const { signals } = scored;
  const since = new Date(saved.lastSignalAt ?? saved.createdAt).getTime();
  const out: PendingAlert[] = [];

  // New price cut since the last check (time-windowed so it fires per cut).
  const newCutDates = signals.priceCutDates.filter((d) => new Date(d).getTime() > since);
  if (newCutDates.length > 0 && signals.totalPriceCutPct >= MIN_CUT_PCT[saved.sensitivity]) {
    out.push({
      trigger: "new_price_cut",
      message: `${listing.title} just dropped to ${formatMoney(
        listing.price,
      )} (down ${(signals.totalPriceCutPct * 100).toFixed(0)}% from first listed). The data says take a look.`,
    });
  }

  // Crossed the days-on-market threshold — fire once.
  if (
    signals.daysOnMarket >= DOM_THRESHOLD[saved.sensitivity] &&
    !alreadyAlerted(saved.userId, saved.listingId, "crossed_days_on_market")
  ) {
    out.push({
      trigger: "crossed_days_on_market",
      message: `${listing.title} has now sat ${signals.daysOnMarket} days — sellers get more flexible the longer a place lingers.`,
    });
  }

  return out;
}

function runForSaved(savedList: SavedListing[]): number {
  let created = 0;
  for (const saved of savedList) {
    const pending = evaluate(saved);
    for (const p of pending) {
      store.createAlert(saved.userId, saved.listingId, p.trigger, p.message);
      created++;
    }
    store.markSignalChecked(saved.id);
  }
  return created;
}

/** Run the watchdog across all watched listings (used by cron). */
export function runWatchdogOnce(): number {
  return runForSaved(store.allWatched());
}

/** Run only for one user (used by the manual /alerts/check endpoint for demos). */
export function runWatchdogForUser(userId: string): number {
  return runForSaved(store.allWatched().filter((s) => s.userId === userId));
}

/** Schedule the recurring job. Runs every 15 minutes. */
export function startWatchdog(): void {
  cron.schedule("*/15 * * * *", () => {
    const n = runWatchdogOnce();
    if (n > 0) console.log(`[watchdog] created ${n} alert(s)`);
  });
  console.log("[watchdog] scheduled (every 15 min)");
}
