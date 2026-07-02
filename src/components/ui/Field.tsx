import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface FieldProps {
  label: ReactNode;
  hint?: ReactNode;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}

export function Field({ label, hint, htmlFor, children, className }: FieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label
        htmlFor={htmlFor}
        className="block text-[11px] font-semibold uppercase tracking-wider text-text-muted"
      >
        {label}
      </label>
      {children}
      {hint && <p className="text-[12px] text-text-subtle">{hint}</p>}
    </div>
  );
}
