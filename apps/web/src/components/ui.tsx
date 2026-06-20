import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";
import { cn } from "../lib/format";

type Variant = "primary" | "cta" | "ghost" | "outline" | "danger";

const variants: Record<Variant, string> = {
  primary: "bg-primary text-white hover:bg-primary-deep",
  cta: "bg-cta text-ink hover:bg-cta-deep font-semibold",
  ghost: "bg-transparent text-ink hover:bg-canvas",
  outline: "bg-white text-ink border border-border hover:border-primary",
  danger: "bg-danger text-white hover:opacity-90",
};

export function Button({
  variant = "primary",
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-[10px] px-4 py-2.5 text-sm transition disabled:opacity-50 disabled:cursor-not-allowed",
        variants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full rounded-[10px] border border-border bg-white px-3 py-2.5 text-sm text-ink placeholder:text-muted focus:border-primary",
        className,
      )}
      {...props}
    />
  );
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "w-full rounded-[10px] border border-border bg-white px-3 py-2.5 text-sm text-ink focus:border-primary",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn("rounded-[12px] border border-border bg-surface shadow-card", className)}>
      {children}
    </div>
  );
}

export function Pill({
  children,
  className,
  tone = "neutral",
}: {
  children: ReactNode;
  className?: string;
  tone?: "neutral" | "success" | "warning" | "danger" | "accent";
}) {
  const tones = {
    neutral: "bg-canvas text-muted",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    danger: "bg-danger/10 text-danger",
    accent: "bg-accent/10 text-accent",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-pill px-2.5 py-1 text-xs font-medium",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded-[8px]", className)} aria-hidden="true" />;
}

export function EmptyState({
  title,
  children,
  icon = "🔍",
}: {
  title: string;
  children?: ReactNode;
  icon?: string;
}) {
  return (
    <div className="rounded-[12px] border border-dashed border-border bg-white p-8 text-center">
      <div className="mb-2 text-3xl" aria-hidden="true">
        {icon}
      </div>
      <h3 className="font-display text-lg text-ink">{title}</h3>
      {children && <div className="mx-auto mt-2 max-w-md text-sm text-muted">{children}</div>}
    </div>
  );
}

export function ErrorState({ onRetry, message }: { onRetry?: () => void; message?: string }) {
  return (
    <div
      role="alert"
      className="rounded-[12px] border border-danger/30 bg-danger/5 p-6 text-center"
    >
      <div className="mb-2 text-2xl" aria-hidden="true">
        ⚠️
      </div>
      <p className="text-sm text-ink">{message ?? "Something went wrong."}</p>
      {onRetry && (
        <Button variant="outline" className="mt-3" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

/** Bottom-sheet / side-panel used for filters on mobile and dialogs. */
export function Sheet({
  open,
  onClose,
  title,
  children,
  side = "right",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  side?: "right" | "bottom";
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-ink/40" onClick={onClose} aria-hidden="true" />
      <div
        className={cn(
          "relative ml-auto flex max-h-full w-full flex-col bg-white shadow-lift",
          side === "right" ? "h-full max-w-md" : "mt-auto rounded-t-[16px]",
        )}
      >
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 className="font-display text-lg">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1 text-muted hover:bg-canvas"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  );
}
