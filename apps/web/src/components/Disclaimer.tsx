import { useDisclaimer } from "../lib/meta";

/**
 * Persistent, non-dismissable disclaimer. Required on affordability + offer +
 * coach outputs. There is intentionally no close button.
 */
export function Disclaimer({ which }: { which: "affordability" | "coach" | "offer" | "verification" | "privacy" }) {
  const text = useDisclaimer(which);
  const isPrivacy = which === "privacy";
  return (
    <p
      role="note"
      className={
        "flex gap-2 rounded-[10px] border px-3 py-2 text-xs leading-relaxed " +
        (isPrivacy
          ? "border-success/30 bg-success/5 text-success"
          : "border-border bg-canvas text-muted")
      }
    >
      <span aria-hidden="true">{isPrivacy ? "🔒" : "ⓘ"}</span>
      <span>{text}</span>
    </p>
  );
}
