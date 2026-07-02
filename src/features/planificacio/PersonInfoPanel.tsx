import { Heart, X } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { StatusPill } from "@/components/ui/StatusPill";
import { SexMarker } from "@/components/ui/SexMarker";
import { cn } from "@/lib/utils";
import { slotsOfMonth } from "@/lib/dates";
import { available, getSeated, personById } from "@/lib/planning";
import { STATUS_LABEL, type Database, type Occurrence } from "@/types";

interface PersonInfoPanelProps {
  pid: string;
  db: Database;
  month: Date;
  onClose: () => void;
}

function Stat({ label, value, tone }: { label: string; value: React.ReactNode; tone?: string }) {
  return (
    <div className="bg-surface-2 rounded-md px-3 py-2">
      <div className="text-lg font-semibold tabular-nums" style={tone ? { color: tone } : undefined}>
        {value}
      </div>
      <div className="text-[11px] text-text-muted">{label}</div>
    </div>
  );
}

function NameList({ ids, db, empty }: { ids: string[]; db: Database; empty: string }) {
  if (ids.length === 0)
    return <p className="text-[12px] text-text-subtle">{empty}</p>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {ids.map((id) => {
        const p = personById(db, id);
        return (
          <span
            key={id}
            className="text-[12px] bg-surface-2 border border-border rounded px-2 py-0.5"
          >
            {p?.nom ?? "?"}
          </span>
        );
      })}
    </div>
  );
}

export function PersonInfoPanel({ pid, db, month, onClose }: PersonInfoPanelProps) {
  const person = personById(db, pid);
  if (!person) return null;

  const occs = slotsOfMonth(month);
  const assigned: Occurrence[] = occs.filter((o) =>
    getSeated(db, o.key).includes(pid),
  );
  const target = db.settings.statusTarget[person.status];
  const availCount = occs.filter((o) => available(db, person, o)).length;
  const overTarget = assigned.length > target;

  return (
    <Card className="flex flex-col max-h-[calc(100vh-10rem)]">
      <div className="flex items-start gap-2 px-4 py-3.5 border-b border-border shrink-0">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold truncate">{person.nom}</span>
            <SexMarker sex={person.sex} />
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <StatusPill status={person.status} />
            <span className="text-[12px] text-text-muted">
              {STATUS_LABEL[person.status]}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Tancar"
          className="shrink-0 size-7 inline-flex items-center justify-center rounded-md text-text-muted hover:bg-surface-2 hover:text-text transition-colors"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>

      <div className="p-4 space-y-4 overflow-y-auto">
        <div className="grid grid-cols-2 gap-2">
          <Stat
            label={`Aquest mes (objectiu ${target})`}
            value={assigned.length}
            tone={overTarget ? "var(--warning)" : undefined}
          />
          <Stat label={`Disponible (de ${occs.length})`} value={availCount} />
        </div>

        <div>
          <div className="text-[11px] uppercase tracking-wider text-text-muted font-semibold mb-1.5">
            Assignacions aquest mes
          </div>
          {assigned.length === 0 ? (
            <p className="text-[12px] text-text-subtle">
              Encara no té cap assignació aquest mes.
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {assigned.map((o) => (
                <span
                  key={o.key}
                  className={cn(
                    "text-[12px] rounded px-2 py-0.5 border",
                    "bg-primary-soft/50 border-[var(--primary)]/25 text-primary-soft-fg",
                  )}
                >
                  {o.label} {o.dateNum}
                </span>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="text-[11px] uppercase tracking-wider text-text-muted font-semibold mb-1.5 flex items-center gap-1.5">
            <Heart className="size-3.5" aria-hidden />
            Prefereix anar amb
          </div>
          <NameList ids={person.pref} db={db} empty="Sense preferències." />
        </div>

        <div>
          <div className="text-[11px] uppercase tracking-wider text-text-muted font-semibold mb-1.5">
            Incompatibilitats
          </div>
          <NameList ids={person.inc} db={db} empty="Cap incompatibilitat." />
        </div>
      </div>
    </Card>
  );
}
