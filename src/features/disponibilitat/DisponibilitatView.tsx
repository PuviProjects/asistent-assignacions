import { useMemo, useState } from "react";
import { Info, Search } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { StatusPill } from "@/components/ui/StatusPill";
import { MonthBar } from "@/components/layout/MonthBar";
import { cn } from "@/lib/utils";
import { DAYNAME, monthKey, shiftMonth, slotsOfMonth } from "@/lib/dates";
import { isAbsent } from "@/lib/planning";
import { useDb } from "@/store/db";
import { STATUS_RANK, type Occurrence } from "@/types";

function firstOfThisMonth() {
  const d = new Date();
  d.setDate(1);
  return d;
}

export function DisponibilitatView() {
  const people = useDb((s) => s.people);
  const monthAvail = useDb((s) => s.monthAvail);
  const toggleOffMonth = useDb((s) => s.toggleOffMonth);

  const [month, setMonth] = useState<Date>(firstOfThisMonth);
  const [query, setQuery] = useState("");

  const occs = useMemo(() => slotsOfMonth(month), [month]);
  const mk = monthKey(month);

  const rows = useMemo(() => {
    const q = query.toLowerCase();
    return people
      .filter((p) => p.nom.toLowerCase().includes(q))
      .sort(
        (a, b) =>
          STATUS_RANK[b.status] - STATUS_RANK[a.status] ||
          a.nom.localeCompare(b.nom),
      );
  }, [people, query]);

  function dotLabel(o: Occurrence) {
    return `${DAYNAME[o.weekday]} ${o.dateNum}${o.tag === "matí" ? "m" : "t"}`;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      <div className="flex items-start gap-2.5 rounded-lg border border-[var(--info)]/30 bg-info-soft px-4 py-3 text-[13px] text-info">
        <Info className="size-4 mt-0.5 shrink-0" aria-hidden />
        <p>
          Marca qui <strong className="font-semibold">no pot</strong> en una data
          concreta del mes. Les franges bloquejades de forma fixa surten en gris
          i les d'un <strong className="font-semibold">període d'absència</strong>{" "}
          en taronja — totes dues s'editen al perfil del germà/ana.
        </p>
      </div>

      <MonthBar
        month={month}
        onPrev={() => setMonth((m) => shiftMonth(m, -1))}
        onNext={() => setMonth((m) => shiftMonth(m, 1))}
        right={
          <div className="w-60">
            <Input
              icon={Search}
              placeholder="Cercar germà…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        }
      />

      <Card className="overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left font-semibold text-[11px] uppercase tracking-wider text-text-muted px-4 py-2.5 w-56">
                Germà/ana
              </th>
              <th className="text-left font-semibold text-[11px] uppercase tracking-wider text-text-muted px-4 py-2.5">
                Dates del mes
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr
                key={p.id}
                className="border-b border-border last:border-0 align-middle"
              >
                <td className="px-4 py-2.5">
                  <span className="inline-flex items-center gap-2">
                    <span className="font-medium">{p.nom}</span>
                    <StatusPill status={p.status} />
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex flex-wrap gap-1.5">
                    {occs.map((o) => {
                      const fixed = p.fixedOff.includes(o.slotId);
                      const absent = isAbsent(p, o.dateObj);
                      const off = monthAvail[mk]?.[p.id]?.includes(o.key);
                      const locked = fixed || absent;
                      return (
                        <button
                          key={o.key}
                          type="button"
                          disabled={locked}
                          onClick={() =>
                            !locked && toggleOffMonth(mk, p.id, o.key)
                          }
                          title={`${o.label} ${o.dateNum} · ${o.time}${
                            fixed
                              ? " (bloqueig fix)"
                              : absent
                                ? " (període d'absència)"
                                : ""
                          }`}
                          className={cn(
                            "text-[11px] leading-none px-1.5 py-1 rounded-md border transition-colors",
                            fixed &&
                              "bg-surface-2 border-border text-text-subtle line-through cursor-not-allowed",
                            absent &&
                              !fixed &&
                              "bg-warning-soft border-[var(--warning)]/30 text-warning line-through cursor-not-allowed",
                            !locked &&
                              off &&
                              "bg-danger-soft border-[var(--danger)]/40 text-danger line-through",
                            !locked &&
                              !off &&
                              "bg-surface border-border text-text-muted hover:border-danger hover:text-danger",
                          )}
                        >
                          {dotLabel(o)}
                        </button>
                      );
                    })}
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={2} className="px-4 py-16 text-center text-text-muted">
                  Cap germà/ana coincideix amb la cerca.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
