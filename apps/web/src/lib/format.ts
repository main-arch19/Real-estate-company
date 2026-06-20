import { formatMoney as sharedFormatMoney } from "@rep/shared";

export const money = (n: number) => sharedFormatMoney(n);

/** Compact price for map pins (e.g. J$42M, J$890K). */
export function pinLabel(n: number, symbol: string): string {
  if (n >= 1_000_000) return `${symbol}${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
  if (n >= 1_000) return `${symbol}${Math.round(n / 1_000)}K`;
  return `${symbol}${n}`;
}

export function pct(n: number, decimals = 0): string {
  return `${(n * 100).toFixed(decimals)}%`;
}

export function relativeDays(days: number): string {
  if (days <= 1) return "today";
  if (days < 30) return `${days} days ago`;
  if (days < 60) return "1 month ago";
  return `${Math.round(days / 30)} months ago`;
}

export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}
