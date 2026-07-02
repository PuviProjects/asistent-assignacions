import { cn } from "@/lib/utils";

export type Variant = "primary" | "secondary" | "ghost" | "outline" | "danger";

export const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-primary text-primary-fg hover:bg-primary-hover border border-transparent",
  secondary:
    "bg-surface text-text border border-border-strong hover:bg-surface-2",
  ghost:
    "bg-transparent text-text-muted hover:bg-surface-2 hover:text-text border border-transparent",
  outline:
    "bg-transparent text-text border border-border-strong hover:bg-surface-2",
  danger:
    "bg-transparent text-danger border border-[var(--danger-soft)] hover:bg-[var(--danger-soft)]",
};

export const BUTTON_BASE =
  "inline-flex items-center justify-center font-medium whitespace-nowrap select-none transition-colors duration-100 outline-none cursor-pointer focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-1 focus-visible:ring-offset-bg disabled:opacity-50 disabled:pointer-events-none";

/** Variant class string (no size) — for composing, e.g. shadcn Calendar nav. */
export function buttonVariants({ variant = "secondary" }: { variant?: Variant } = {}) {
  return cn(BUTTON_BASE, VARIANTS[variant]);
}
