import { forwardRef, type SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => (
    <div className="relative inline-flex items-center w-full">
      <select
        ref={ref}
        className={cn(
          "h-9 w-full appearance-none rounded-md bg-surface border border-border-strong",
          "text-sm text-text pl-3 pr-9",
          "transition-colors outline-none cursor-pointer",
          "hover:border-text-subtle",
          "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        className="absolute right-3 size-4 text-text-subtle pointer-events-none"
        aria-hidden
      />
    </div>
  ),
);
Select.displayName = "Select";
