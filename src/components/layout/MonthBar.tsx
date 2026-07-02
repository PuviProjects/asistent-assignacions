import { useEffect, useState, type ReactNode } from "react";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { MONTHS_CA, monthLabel } from "@/lib/dates";
import { cn } from "@/lib/utils";

interface MonthBarProps {
  month: Date;
  onPrev: () => void;
  onNext: () => void;
  /** Jump to an arbitrary month/year picked from the dropdown. */
  onPick: (d: Date) => void;
  right?: ReactNode;
}

/** Clickable month/year label that opens a popover to jump to any month. */
function MonthYearPicker({
  month,
  onPick,
}: {
  month: Date;
  onPick: (d: Date) => void;
}) {
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(month.getFullYear());

  // Reset the navigated year to the active month whenever the popover opens.
  useEffect(() => {
    if (open) setViewYear(month.getFullYear());
  }, [open, month]);

  const selMonth = month.getMonth();
  const selYear = month.getFullYear();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Seleccionar mes i any"
          className="group flex items-center justify-center gap-1.5 min-w-44 h-9 px-2.5 rounded-md text-lg font-semibold tracking-tight capitalize text-text hover:bg-surface-2 transition-colors"
        >
          {monthLabel(month)}
          <ChevronDown
            className="size-4 text-text-muted transition-transform duration-200 group-data-[state=open]:rotate-180"
            aria-hidden
          />
        </button>
      </PopoverTrigger>
      <PopoverContent align="center" className="w-64 p-3">
        {/* Year stepper */}
        <div className="flex items-center justify-between mb-2.5">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setViewYear((y) => y - 1)}
            aria-label="Any anterior"
          >
            <ChevronLeft className="size-4" aria-hidden />
          </Button>
          <div className="text-sm font-semibold tabular-nums">{viewYear}</div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setViewYear((y) => y + 1)}
            aria-label="Any següent"
          >
            <ChevronRight className="size-4" aria-hidden />
          </Button>
        </div>

        {/* Month grid */}
        <div className="grid grid-cols-3 gap-1.5">
          {MONTHS_CA.map((name, i) => {
            const isSel = i === selMonth && viewYear === selYear;
            return (
              <button
                key={name}
                type="button"
                aria-current={isSel ? "true" : undefined}
                onClick={() => {
                  onPick(new Date(viewYear, i, 1));
                  setOpen(false);
                }}
                className={cn(
                  "h-9 rounded-md text-[13px] font-medium capitalize transition-colors",
                  isSel
                    ? "bg-primary text-primary-fg"
                    : "text-text hover:bg-surface-2",
                )}
              >
                {name.slice(0, 3)}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function MonthBar({ month, onPrev, onNext, onPick, right }: MonthBarProps) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" onClick={onPrev} aria-label="Mes anterior">
          <ChevronLeft className="size-4" aria-hidden />
        </Button>
        <MonthYearPicker month={month} onPick={onPick} />
        <Button variant="ghost" size="icon" onClick={onNext} aria-label="Mes següent">
          <ChevronRight className="size-4" aria-hidden />
        </Button>
      </div>
      {right && (
        <>
          <div className="flex-1" />
          {right}
        </>
      )}
    </div>
  );
}
