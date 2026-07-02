import { useState, type DragEvent } from "react";
import { AlertTriangle, GripVertical, Plus, X } from "lucide-react";
import { StatusPill } from "@/components/ui/StatusPill";
import { SexMarker } from "@/components/ui/SexMarker";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { getSeated, personById, seatFlags, slotWarnings } from "@/lib/planning";
import type { Database, Occurrence } from "@/types";

export interface DragSource {
  occKey: string;
  pid: string;
}

interface SlotCardProps {
  occ: Occurrence;
  db: Database;
  selected: boolean;
  selectedPid: string | null;
  onSelect: (occKey: string) => void;
  onSelectPerson: (pid: string) => void;
  onRemove: (occKey: string, pid: string) => void;
  onMove: (from: DragSource, to: { occKey: string; pid?: string }) => void;
}

function readSource(e: DragEvent): DragSource | null {
  try {
    return JSON.parse(e.dataTransfer.getData("application/json"));
  } catch {
    return null;
  }
}

export function SlotCard({
  occ,
  db,
  selected,
  selectedPid,
  onSelect,
  onSelectPerson,
  onRemove,
  onMove,
}: SlotCardProps) {
  const seated = getSeated(db, occ.key);
  const warnings = slotWarnings(db, occ);
  const seatsPerSlot = db.settings.seatsPerSlot;
  const full = seated.length === seatsPerSlot && warnings.length === 0;
  const [dragOver, setDragOver] = useState<number | null>(null);

  function handleDrop(e: DragEvent, targetPid?: string) {
    e.preventDefault();
    setDragOver(null);
    const src = readSource(e);
    if (src) onMove(src, { occKey: occ.key, pid: targetPid });
  }

  return (
    <div
      className={cn(
        "bg-surface border rounded-lg overflow-hidden shadow-[var(--shadow-sm)]",
        full ? "border-[var(--success)]/35" : "border-border",
      )}
    >
      <div
        className={cn(
          "flex items-center justify-between px-3 py-2 border-b",
          full
            ? "bg-success-soft border-[var(--success)]/25"
            : "bg-surface-2 border-border",
        )}
      >
        <span className="text-[13px] font-semibold">
          {occ.label} {occ.dateNum}
        </span>
        <span className="text-[11px] text-text-muted">{occ.time}</span>
      </div>

      <div className="p-2 flex flex-col gap-1.5">
        {Array.from({ length: seatsPerSlot }).map((_, i) => {
          const pid = seated[i];
          const isOver = dragOver === i;
          if (pid) {
            const p = personById(db, pid);
            const flags = seatFlags(db, occ, pid);
            const danger = flags.some((f) => f.severity === "danger");
            const isSel = selectedPid === pid;
            return (
              <div
                key={i}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = "move";
                  e.dataTransfer.setData(
                    "application/json",
                    JSON.stringify({ occKey: occ.key, pid }),
                  );
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(i);
                }}
                onDragLeave={() => setDragOver((v) => (v === i ? null : v))}
                onDrop={(e) => handleDrop(e, pid)}
                onClick={() => onSelectPerson(pid)}
                className={cn(
                  "group flex items-center gap-1.5 px-2 py-1.5 rounded-md border min-h-9 cursor-pointer transition-colors",
                  isOver
                    ? "border-primary bg-primary-soft ring-1 ring-[var(--primary)]/50"
                    : isSel
                      ? "border-primary bg-primary-soft/60 ring-1 ring-[var(--primary)]/40"
                      : "border-border bg-surface hover:bg-surface-2",
                )}
              >
                <GripVertical
                  className="size-3.5 shrink-0 text-text-subtle opacity-50 group-hover:opacity-100 cursor-grab"
                  aria-hidden
                />
                {p && <StatusPill status={p.status} />}
                <span className="text-[13px] font-medium flex-1 min-w-0 leading-tight">
                  {p ? p.nom : "?"}
                </span>
                {flags.length > 0 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="shrink-0 inline-flex">
                        <AlertTriangle
                          className={cn(
                            "size-3.5",
                            danger ? "text-danger" : "text-warning",
                          )}
                          aria-label="Avisos"
                        />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <ul className="space-y-0.5">
                        {flags.map((f, idx) => (
                          <li key={idx}>{f.text}</li>
                        ))}
                      </ul>
                    </TooltipContent>
                  </Tooltip>
                )}
                {p && <SexMarker sex={p.sex} />}
                <button
                  type="button"
                  draggable={false}
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(occ.key, pid);
                  }}
                  aria-label="Treure"
                  className="shrink-0 size-6 inline-flex items-center justify-center rounded text-text-subtle hover:bg-danger-soft hover:text-danger transition-colors"
                >
                  <X className="size-3.5" aria-hidden />
                </button>
              </div>
            );
          }
          return (
            <button
              key={i}
              type="button"
              onClick={() => onSelect(occ.key)}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(i);
              }}
              onDragLeave={() => setDragOver((v) => (v === i ? null : v))}
              onDrop={(e) => handleDrop(e)}
              className={cn(
                "flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md border border-dashed min-h-9",
                "text-[12px] transition-colors",
                isOver
                  ? "border-primary text-primary bg-primary-soft"
                  : selected
                    ? "border-primary text-primary bg-primary-soft"
                    : "border-border text-text-subtle hover:border-primary hover:text-primary hover:bg-primary-soft",
              )}
            >
              <Plus className="size-3.5" aria-hidden />
              afegir germà/ana
            </button>
          );
        })}
      </div>

      {warnings.length > 0 && (
        <div className="flex items-start gap-1.5 px-3 py-2 text-[11px] bg-warning-soft text-warning border-t border-[var(--warning)]/25">
          <AlertTriangle className="size-3.5 mt-px shrink-0" aria-hidden />
          <span>{warnings.join(" · ")}</span>
        </div>
      )}
    </div>
  );
}
