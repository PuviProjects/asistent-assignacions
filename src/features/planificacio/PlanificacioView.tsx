import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Eraser, RefreshCw, Zap } from "lucide-react";
import { SlotText } from "slot-text/react";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import {
  Dropdown,
  DropdownContent,
  DropdownItem,
  DropdownTrigger,
} from "@/components/ui/DropdownMenu";
import { MonthBar } from "@/components/layout/MonthBar";
import { getSeated, slotWarnings } from "@/lib/planning";
import { shiftMonth, slotsOfMonth, monthKey } from "@/lib/dates";
import { useDb } from "@/store/db";
import type { Database } from "@/types";
import { SlotCard } from "./SlotCard";
import { SuggestionsPanel } from "./SuggestionsPanel";
import { PersonInfoPanel } from "./PersonInfoPanel";

type Selection =
  | { type: "seat"; occKey: string }
  | { type: "person"; pid: string }
  | null;

function nextMonth() {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + 1);
  return d;
}

function Kpi({
  value,
  label,
  tone,
}: {
  value: string | number;
  label: string;
  tone?: "warn" | "ok";
}) {
  return (
    <div className="bg-surface-2 rounded-lg px-4 py-3">
      <SlotText
        text={String(value)}
        className="block text-2xl font-semibold tabular-nums"
        style={
          tone
            ? { color: tone === "warn" ? "var(--warning)" : "var(--success)" }
            : undefined
        }
      />
      <div className="text-[11px] uppercase tracking-wider text-text-muted mt-0.5">
        {label}
      </div>
    </div>
  );
}

export function PlanificacioView() {
  const people = useDb((s) => s.people);
  const monthAvail = useDb((s) => s.monthAvail);
  const plan = useDb((s) => s.plan);
  const seatPerson = useDb((s) => s.seatPerson);
  const unseatPerson = useDb((s) => s.unseatPerson);
  const moveSeat = useDb((s) => s.moveSeat);
  const clearMonth = useDb((s) => s.clearMonth);
  const runAutoAssign = useDb((s) => s.runAutoAssign);
  const settings = useDb((s) => s.settings);

  const db: Database = useMemo(
    () => ({ people, monthAvail, plan, settings }),
    [people, monthAvail, plan, settings],
  );

  const [month, setMonth] = useState<Date>(nextMonth);
  const [selection, setSelection] = useState<Selection>(null);

  // Detect when the sticky month bar is pinned under the navbar (top-14 = 56px)
  // so it can compact horizontally once it sticks.
  const barRef = useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = useState(false);
  useEffect(() => {
    const onScroll = () => {
      const el = barRef.current;
      if (el) setStuck(el.getBoundingClientRect().top <= 56);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const selectedSeatKey = selection?.type === "seat" ? selection.occKey : null;
  const selectedPid = selection?.type === "person" ? selection.pid : null;

  const occs = useMemo(() => slotsOfMonth(month), [month]);
  const mk = monthKey(month);

  const kpis = useMemo(() => {
    let filled = 0;
    let warn = 0;
    const distinct = new Set<string>();
    for (const o of occs) {
      const seated = getSeated(db, o.key);
      filled += seated.length;
      seated.forEach((id) => distinct.add(id));
      if (slotWarnings(db, o).length) warn++;
    }
    return {
      count: occs.length,
      filled,
      total: occs.length * db.settings.seatsPerSlot,
      distinct: distinct.size,
      warn,
    };
  }, [db, occs]);

  const byWeek = useMemo(() => {
    const map = new Map<number, typeof occs>();
    for (const o of occs) {
      const arr = map.get(o.week) ?? [];
      arr.push(o);
      map.set(o.week, arr);
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }, [occs]);

  const selectedOcc = occs.find((o) => o.key === selectedSeatKey) ?? null;

  function changeMonth(delta: number) {
    setMonth((m) => shiftMonth(m, delta));
    setSelection(null);
  }

  function pickMonth(d: Date) {
    setMonth(d);
    setSelection(null);
  }

  function handleClear() {
    if (!window.confirm("Buidar totes les assignacions d'aquest mes?")) return;
    clearMonth(mk);
    setSelection(null);
    toast.success("Mes buidat");
  }

  function handleAuto() {
    runAutoAssign(month);
    toast.success("Assignació automàtica completada");
  }

  function handleRedoAll() {
    if (
      !window.confirm(
        "Refer tot el mes? Es perdran totes les assignacions actuals i es tornaran a generar des de zero.",
      )
    )
      return;
    clearMonth(mk);
    runAutoAssign(month);
    setSelection(null);
    toast.success("Mes refet de nou");
  }

  return (
    <div className="max-w-[1700px] mx-auto">
      {/* Sticky month bar — a frosted header whose blur and background tint
          dissolve progressively into the content scrolling beneath it (via a
          gradient mask), so there's no hard cut line. The backdrop layer is
          absolute, so its fade overhang doesn't reserve layout space. Once it
          pins under the navbar it compacts horizontally for a condensed feel. */}
      <div ref={barRef} className="sticky top-14 z-30 -mt-4 pointer-events-none">
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 bottom-[-2.25rem] backdrop-blur-md bg-gradient-to-b from-bg from-45% to-transparent [mask-image:linear-gradient(to_bottom,#000_0%,#000_52%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,#000_0%,#000_52%,transparent_100%)]"
        />
        <div
          className={cn(
            "relative pointer-events-auto pt-3 pb-4 transition-[padding] duration-300 ease-out",
            stuck ? "px-5" : "px-0",
          )}
        >
        <MonthBar
          month={month}
          onPrev={() => changeMonth(-1)}
          onNext={() => changeMonth(1)}
          onPick={pickMonth}
          right={
            <div className="flex items-center gap-2.5">
              <Button variant="secondary" onClick={handleClear}>
                <Eraser className="size-4" aria-hidden />
                Buidar mes
              </Button>
              <div className="flex items-center">
                <Button
                  variant="primary"
                  onClick={handleAuto}
                  className="rounded-r-none"
                >
                  <Zap className="size-4" aria-hidden />
                  Assignació automàtica
                </Button>
                <Dropdown>
                  <DropdownTrigger asChild>
                    <Button
                      variant="primary"
                      size="icon"
                      aria-label="Més opcions d'assignació"
                      className="w-8 rounded-l-none border-l border-[var(--primary-fg)]/20"
                    >
                      <ChevronDown className="size-4" aria-hidden />
                    </Button>
                  </DropdownTrigger>
                  <DropdownContent>
                    <DropdownItem
                      onSelect={handleRedoAll}
                      danger
                      icon={<RefreshCw className="size-4" aria-hidden />}
                    >
                      Refer tot el mes
                    </DropdownItem>
                  </DropdownContent>
                </Dropdown>
              </div>
            </div>
          }
        />
        </div>
      </div>

      {occs.length === 0 ? (
        <div className="text-center py-20 text-text-muted">
          <h3 className="text-lg font-semibold text-text">Cap data aquest mes</h3>
          <p className="mt-1 text-sm">
            No hi ha dimarts, divendres ni dissabtes configurats.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[11rem_minmax(0,1fr)_340px] gap-5 items-start">
          {/* KPIs — vertical column, sticky on the left. */}
          <div className="grid grid-cols-2 gap-3 lg:flex lg:flex-col lg:sticky lg:top-40">
            <Kpi value={kpis.count} label="Assignacions" />
            <Kpi value={`${kpis.filled}/${kpis.total}`} label="Llocs coberts" />
            <Kpi value={kpis.distinct} label="Germans implicats" />
            <Kpi
              value={kpis.warn}
              label="Avisos"
              tone={kpis.warn ? "warn" : "ok"}
            />
          </div>

          <div className="space-y-6">
            {byWeek.map(([week, weekOccs]) => (
              <div key={week}>
                <div className="text-[11px] uppercase tracking-wider text-text-muted font-semibold mb-2.5 ml-0.5">
                  Setmana {week}
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {/* Col 1: Dimarts matí + tarda apilats */}
                  <div className="flex flex-col gap-3">
                    {weekOccs.filter((o) => o.weekday === 2).map((occ) => (
                      <SlotCard
                        key={occ.key}
                        occ={occ}
                        db={db}
                        selected={selectedSeatKey === occ.key}
                        selectedPid={selectedPid}
                        onSelect={(k) => setSelection({ type: "seat", occKey: k })}
                        onSelectPerson={(pid) =>
                          setSelection({ type: "person", pid })
                        }
                        onRemove={unseatPerson}
                        onMove={moveSeat}
                      />
                    ))}
                  </div>
                  {/* Col 2: Divendres */}
                  <div className="flex flex-col gap-3">
                    {weekOccs.filter((o) => o.weekday === 5).map((occ) => (
                      <SlotCard
                        key={occ.key}
                        occ={occ}
                        db={db}
                        selected={selectedSeatKey === occ.key}
                        selectedPid={selectedPid}
                        onSelect={(k) => setSelection({ type: "seat", occKey: k })}
                        onSelectPerson={(pid) =>
                          setSelection({ type: "person", pid })
                        }
                        onRemove={unseatPerson}
                        onMove={moveSeat}
                      />
                    ))}
                  </div>
                  {/* Col 3: Dissabte */}
                  <div className="flex flex-col gap-3">
                    {weekOccs.filter((o) => o.weekday === 6).map((occ) => (
                      <SlotCard
                        key={occ.key}
                        occ={occ}
                        db={db}
                        selected={selectedSeatKey === occ.key}
                        selectedPid={selectedPid}
                        onSelect={(k) => setSelection({ type: "seat", occKey: k })}
                        onSelectPerson={(pid) =>
                          setSelection({ type: "person", pid })
                        }
                        onRemove={unseatPerson}
                        onMove={moveSeat}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="lg:sticky lg:top-40">
            {selectedPid ? (
              <PersonInfoPanel
                pid={selectedPid}
                db={db}
                month={month}
                onClose={() => setSelection(null)}
              />
            ) : (
              <SuggestionsPanel occ={selectedOcc} db={db} onAssign={seatPerson} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
