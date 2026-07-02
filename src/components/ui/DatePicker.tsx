import { useMemo, useState } from "react";
import { format, parse } from "date-fns";
import { ca } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

function fromISO(s: string | undefined): Date | undefined {
  if (!s) return undefined;
  const d = parse(s, "yyyy-MM-dd", new Date());
  return Number.isNaN(d.getTime()) ? undefined : d;
}

interface DatePickerProps {
  /** ISO date yyyy-MM-dd, or "" for empty. */
  value: string;
  onChange: (iso: string) => void;
  placeholder?: string;
  /** Disable days before this ISO date. */
  minISO?: string;
  /** Disable days after this ISO date. */
  maxISO?: string;
  className?: string;
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Tria una data",
  minISO,
  maxISO,
  className,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const date = fromISO(value);

  const disabled = useMemo(() => {
    const min = fromISO(minISO);
    const max = fromISO(maxISO);
    const matchers = [];
    if (min) matchers.push({ before: min });
    if (max) matchers.push({ after: max });
    return matchers.length ? matchers : undefined;
  }, [minISO, maxISO]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "h-9 justify-start gap-2 font-normal",
            !date && "text-text-subtle",
            className,
          )}
        >
          <CalendarIcon className="size-4 shrink-0" aria-hidden />
          {date ? format(date, "dd/MM/yyyy") : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          defaultMonth={date}
          onSelect={(d) => {
            onChange(d ? format(d, "yyyy-MM-dd") : "");
            setOpen(false);
          }}
          disabled={disabled}
          locale={ca}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  );
}
