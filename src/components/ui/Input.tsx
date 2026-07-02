import { forwardRef, type InputHTMLAttributes } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: LucideIcon;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, icon: Icon, ...props }, ref) => (
    <div className="relative flex items-center">
      {Icon && (
        <Icon
          className="absolute left-3 size-4 text-text-subtle pointer-events-none"
          aria-hidden
        />
      )}
      <input
        ref={ref}
        className={cn(
          "h-9 w-full rounded-md bg-surface border border-border-strong",
          "text-sm text-text placeholder:text-text-subtle",
          "transition-colors outline-none",
          "hover:border-text-subtle",
          "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30",
          Icon ? "pl-9 pr-3" : "px-3",
          className,
        )}
        {...props}
      />
    </div>
  ),
);
Input.displayName = "Input";
