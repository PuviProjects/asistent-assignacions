import { cn } from "@/lib/utils";
import { STATUS_LABEL, type Status } from "@/types";

const STYLES: Record<Status, string> = {
  PR: "bg-pr-soft text-pr border-pr-border",
  AC: "bg-ac-soft text-ac border-ac-border",
  AO: "bg-ao-soft text-ao border-ao-border",
  PN: "bg-pn-soft text-pn border-pn-border",
};

interface StatusPillProps {
  status: Status;
  /** Show the full label instead of the code. */
  withLabel?: boolean;
  className?: string;
}

export function StatusPill({ status, withLabel, className }: StatusPillProps) {
  return (
    <span
      title={STATUS_LABEL[status]}
      className={cn(
        "inline-flex items-center gap-1 rounded-pill border px-2 py-0.5",
        "text-[11px] font-semibold leading-tight",
        STYLES[status],
        className,
      )}
    >
      {status}
      {withLabel && (
        <span className="font-medium opacity-80">· {STATUS_LABEL[status]}</span>
      )}
    </span>
  );
}
