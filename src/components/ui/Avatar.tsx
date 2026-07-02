import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/** Initials from a name, handling "Cognom, Nom" and single names. */
function initials(name: string): string {
  const parts = name.replace(/,/g, "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

interface AvatarProps {
  name: string;
  className?: string;
}

export function Avatar({ name, className }: AvatarProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          aria-label={name}
          className={cn(
            "inline-flex items-center justify-center size-7 rounded-full shrink-0",
            "bg-surface-2 border border-border text-[10px] font-semibold text-text-muted select-none cursor-default",
            className,
          )}
        >
          {initials(name)}
        </span>
      </TooltipTrigger>
      <TooltipContent>{name}</TooltipContent>
    </Tooltip>
  );
}
