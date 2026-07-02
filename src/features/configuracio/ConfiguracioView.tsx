import { useState } from "react";
import { Info, ListOrdered, Minus, Plus, RotateCcw, Target, Users } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { StatusPill } from "@/components/ui/StatusPill";
import { cn } from "@/lib/utils";
import { useDb } from "@/store/db";
import {
  defaultSettings,
  SEATS_MAX,
  SEATS_MIN,
  STATUS_LABEL,
  STATUS_ORDER,
  type Status,
} from "@/types";

/** A compact −/＋ stepper for a bounded integer. */
function Stepper({
  value,
  min,
  max,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  const set = (v: number) => onChange(Math.min(max, Math.max(min, v)));
  return (
    <div className="inline-flex items-center rounded-md border border-border-strong bg-surface">
      <button
        type="button"
        onClick={() => set(value - 1)}
        disabled={value <= min}
        aria-label="Restar"
        className="size-9 inline-flex items-center justify-center text-text-muted hover:bg-surface-2 hover:text-text disabled:opacity-40 disabled:pointer-events-none rounded-l-md transition-colors"
      >
        <Minus className="size-4" aria-hidden />
      </button>
      <span className="w-10 text-center text-sm font-semibold tabular-nums select-none">
        {value}
      </span>
      <button
        type="button"
        onClick={() => set(value + 1)}
        disabled={value >= max}
        aria-label="Sumar"
        className="size-9 inline-flex items-center justify-center text-text-muted hover:bg-surface-2 hover:text-text disabled:opacity-40 disabled:pointer-events-none rounded-r-md transition-colors"
      >
        <Plus className="size-4" aria-hidden />
      </button>
    </div>
  );
}

/** A per-status editable numeric table (priority weights / monthly targets). */
function StatusNumberTable({
  values,
  onChange,
  min,
  max,
}: {
  values: Record<Status, number>;
  onChange: (status: Status, v: number) => void;
  min: number;
  max: number;
}) {
  return (
    <div className="divide-y divide-border">
      {STATUS_ORDER.map((st) => (
        <div key={st} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
          <StatusPill status={st} />
          <span className="flex-1 min-w-0 text-[13px] text-text-muted truncate">
            {STATUS_LABEL[st]}
          </span>
          <input
            type="number"
            inputMode="numeric"
            min={min}
            max={max}
            value={values[st]}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (Number.isNaN(n)) return;
              onChange(st, Math.min(max, Math.max(min, Math.round(n))));
            }}
            className={cn(
              "h-9 w-20 rounded-md bg-surface border border-border-strong px-2.5 text-right",
              "text-sm font-medium text-text tabular-nums outline-none transition-colors",
              "hover:border-text-subtle focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30",
            )}
          />
        </div>
      ))}
    </div>
  );
}

export function ConfiguracioView() {
  const settings = useDb((s) => s.settings);
  const plan = useDb((s) => s.plan);
  const updateSettings = useDb((s) => s.updateSettings);
  const setSeatsPerSlot = useDb((s) => s.setSeatsPerSlot);

  // A pending seats reduction awaiting confirmation (would drop people).
  const [pendingSeats, setPendingSeats] = useState<number | null>(null);

  const isDefault =
    JSON.stringify(settings) === JSON.stringify(defaultSettings());

  /** Slots and people that would be dropped by reducing to `n` seats. */
  function overflowFor(n: number) {
    let slots = 0;
    let people = 0;
    for (const k in plan) {
      const extra = plan[k].length - n;
      if (extra > 0) {
        slots++;
        people += extra;
      }
    }
    return { slots, people };
  }

  /** Apply a seats change, prompting first if it would drop assigned people. */
  function requestSeats(n: number) {
    if (n < settings.seatsPerSlot && overflowFor(n).people > 0) {
      setPendingSeats(n);
      return;
    }
    setSeatsPerSlot(n);
  }

  function resetDefaults() {
    const d = defaultSettings();
    // Weights/targets are non-destructive — apply immediately.
    updateSettings({ statusPriority: d.statusPriority, statusTarget: d.statusTarget });
    // Seats may drop assigned people — route through the guarded path.
    requestSeats(d.seatsPerSlot);
  }

  const pendingInfo = pendingSeats !== null ? overflowFor(pendingSeats) : null;

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-2.5 rounded-lg border border-[var(--info)]/30 bg-info-soft px-4 py-3 text-[13px] text-info">
          <Info className="size-4 mt-0.5 shrink-0" aria-hidden />
          <p>
            Aquests paràmetres afecten com es generen i validen les assignacions
            (suggeriments, auto-assignació i avisos). Els canvis s'apliquen
            immediatament.
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          disabled={isDefault}
          onClick={resetDefaults}
        >
          <RotateCcw className="size-4" aria-hidden />
          Restablir per defecte
        </Button>
      </div>

      <Card>
        <CardHeader
          title={
            <span className="flex items-center gap-2">
              <Users className="size-4 text-primary" aria-hidden />
              Persones per assignació
            </span>
          }
          description="Quantes places té cada torn del taulell de planificació."
        />
        <CardBody className="flex items-center justify-between">
          <span className="text-[13px] text-text-muted">
            Entre {SEATS_MIN} i {SEATS_MAX} germans per lloc.
          </span>
          <Stepper
            value={settings.seatsPerSlot}
            min={SEATS_MIN}
            max={SEATS_MAX}
            onChange={requestSeats}
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title={
            <span className="flex items-center gap-2">
              <ListOrdered className="size-4 text-primary" aria-hidden />
              Prioritat per status
            </span>
          }
          description="Pes amb què es prioritza cada status en suggerir i auto-assignar. Un valor més alt significa més prioritat."
        />
        <CardBody>
          <StatusNumberTable
            values={settings.statusPriority}
            min={0}
            max={999}
            onChange={(status, v) =>
              updateSettings({
                statusPriority: { ...settings.statusPriority, [status]: v },
              })
            }
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title={
            <span className="flex items-center gap-2">
              <Target className="size-4 text-primary" aria-hidden />
              Objectiu mensual per status
            </span>
          }
          description="Nombre orientatiu de sortides al mes. En superar-lo, es penalitza la persona i es mostra un avís."
        />
        <CardBody>
          <StatusNumberTable
            values={settings.statusTarget}
            min={0}
            max={99}
            onChange={(status, v) =>
              updateSettings({
                statusTarget: { ...settings.statusTarget, [status]: v },
              })
            }
          />
        </CardBody>
      </Card>

      <Dialog
        open={pendingSeats !== null}
        onOpenChange={(o) => !o && setPendingSeats(null)}
        title="Reduir places per assignació"
        description={
          pendingInfo
            ? `${pendingInfo.slots} ${pendingInfo.slots === 1 ? "assignació supera" : "assignacions superen"} les ${pendingSeats} places.`
            : undefined
        }
        footer={
          <>
            <Button variant="ghost" onClick={() => setPendingSeats(null)}>
              Cancel·lar
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (pendingSeats !== null) setSeatsPerSlot(pendingSeats);
                setPendingSeats(null);
              }}
            >
              Treure {pendingInfo?.people}{" "}
              {pendingInfo?.people === 1 ? "germà/ana" : "germans"}
            </Button>
          </>
        }
      >
        <p className="text-[13px] text-text-muted leading-relaxed">
          En reduir a {pendingSeats} places es trauran els{" "}
          <strong className="font-semibold text-text">
            {pendingInfo?.people} germans
          </strong>{" "}
          que sobren d'aquestes assignacions (els últims afegits a cada torn).
          Aquesta acció no es pot desfer.
        </p>
      </Dialog>
    </div>
  );
}
