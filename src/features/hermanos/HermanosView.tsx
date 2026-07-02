import { useMemo, useState } from "react";
import { Plus, Search, Pencil } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Card } from "@/components/ui/Card";
import { StatusPill } from "@/components/ui/StatusPill";
import { SexMarker } from "@/components/ui/SexMarker";
import { Avatar } from "@/components/ui/Avatar";
import { SLOT_DEFS } from "@/lib/dates";
import { useDb } from "@/store/db";
import {
  SEX_LABEL,
  STATUS_RANK,
  type Sex,
  type SlotDef,
  type Status,
} from "@/types";
import { PersonModal } from "./PersonModal";

const STATUS_OPTIONS: Status[] = ["PR", "AC", "AO", "PN"];

const DAY_SHORT: Record<string, string> = {
  Dimarts: "Dt",
  Divendres: "Dv",
  Dissabte: "Ds",
};

/** Compact slot label for tags, e.g. "Dt matí". */
function slotTag(s: SlotDef): string {
  return `${DAY_SHORT[s.label] ?? s.label} ${s.tag}`;
}

export function HermanosView() {
  const people = useDb((s) => s.people);

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<Status | "">("");
  const [sex, setSex] = useState<Sex | "">("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const rows = useMemo(() => {
    const q = query.toLowerCase();
    return people
      .filter((p) => p.nom.toLowerCase().includes(q))
      .filter((p) => !status || p.status === status)
      .filter((p) => !sex || p.sex === sex)
      .sort(
        (a, b) =>
          STATUS_RANK[b.status] - STATUS_RANK[a.status] ||
          a.nom.localeCompare(b.nom),
      );
  }, [people, query, status, sex]);

  function openNew() {
    setEditingId(null);
    setModalOpen(true);
  }
  function openEdit(id: string) {
    setEditingId(id);
    setModalOpen(true);
  }

  const nameById = useMemo(
    () => Object.fromEntries(people.map((p) => [p.id, p.nom])),
    [people],
  );

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-60">
          <Input
            icon={Search}
            placeholder="Cercar per nom…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="w-52">
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value as Status | "")}
          >
            <option value="">Tots els status</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </div>
        <div className="w-32">
          <Select
            value={sex}
            onChange={(e) => setSex(e.target.value as Sex | "")}
          >
            <option value="">Tots</option>
            <option value="H">Homes</option>
            <option value="D">Dones</option>
          </Select>
        </div>
        <span className="text-[12px] text-text-muted bg-surface-2 rounded-pill px-2.5 py-1">
          {rows.length} de {people.length}
        </span>
        <div className="flex-1" />
        <Button variant="primary" onClick={openNew}>
          <Plus className="size-4" aria-hidden />
          Nou germà/ana
        </Button>
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-border">
              {["Nom", "Sexe", "Status", "Disponible", "Preferències", ""].map(
                (h, i) => (
                  <th
                    key={i}
                    className="text-left font-semibold text-[11px] uppercase tracking-wider text-text-muted px-4 py-2.5"
                  >
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => {
              const availableSlots = SLOT_DEFS.filter(
                (s) => !p.fixedOff.includes(s.id),
              );
              return (
                <tr
                  key={p.id}
                  className="border-b border-border last:border-0 hover:bg-surface-2/50 transition-colors"
                >
                  <td className="px-4 py-2.5 font-medium">{p.nom}</td>
                  <td className="px-4 py-2.5">
                    <span className="inline-flex items-center gap-1.5">
                      <SexMarker sex={p.sex} />
                      <span className="text-text-muted text-[13px]">
                        {SEX_LABEL[p.sex]}
                      </span>
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <StatusPill status={p.status} />
                  </td>
                  <td className="px-4 py-2.5">
                    {availableSlots.length === 0 ? (
                      <span className="text-text-subtle">Cap</span>
                    ) : availableSlots.length === SLOT_DEFS.length ? (
                      <span className="text-[11px] bg-success-soft text-success rounded px-1.5 py-0.5">
                        Totes
                      </span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {availableSlots.map((s) => (
                          <span
                            key={s.id}
                            className="text-[11px] bg-surface-2 text-text-muted border border-border rounded px-1.5 py-0.5 whitespace-nowrap"
                          >
                            {slotTag(s)}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    {p.pref.length ? (
                      <div className="flex items-center -space-x-1.5">
                        {p.pref.map((id) => (
                          <Avatar
                            key={id}
                            name={nameById[id] ?? "?"}
                            className="ring-2 ring-[var(--surface)]"
                          />
                        ))}
                      </div>
                    ) : (
                      <span className="text-text-subtle">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEdit(p.id)}
                    >
                      <Pencil className="size-3.5" aria-hidden />
                      Editar
                    </Button>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-16 text-center text-text-muted">
                  Cap germà/ana coincideix amb els filtres.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      <PersonModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        personId={editingId}
      />
    </div>
  );
}
