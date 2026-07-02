import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { StatusPill } from "@/components/ui/StatusPill";
import { SexMarker } from "@/components/ui/SexMarker";
import { available, evaluate, getSeated } from "@/lib/planning";
import type { Database, Occurrence, Person } from "@/types";
import type { EvalResult } from "@/lib/planning";

const PAGE_SIZE = 4;

interface SuggestionsPanelProps {
  occ: Occurrence | null;
  db: Database;
  onAssign: (occKey: string, pid: string) => void;
}

interface Candidate {
  person: Person;
  ev: EvalResult;
}

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-4 py-8 text-center text-[13px] text-text-muted">
      {children}
    </div>
  );
}

export function SuggestionsPanel({ occ, db, onAssign }: SuggestionsPanelProps) {
  const full = occ
    ? getSeated(db, occ.key).length >= db.settings.seatsPerSlot
    : false;

  return (
    <Card className="flex flex-col max-h-[calc(100vh-10rem)]">
      <CardHeader
        title={occ ? `${occ.label} ${occ.dateNum}` : "Suggeriments"}
        description={occ?.time}
      />
      {!occ ? (
        <Hint>
          Selecciona un lloc buit en una assignació per veure qui hi encaixa
          millor.
        </Hint>
      ) : full ? (
        <Hint>
          Aquesta assignació ja té {db.settings.seatsPerSlot} germans. Treu algú
          per canviar-lo.
        </Hint>
      ) : (
        // key resets search + page each time a different slot is selected.
        <Body key={occ.key} occ={occ} db={db} onAssign={onAssign} />
      )}
    </Card>
  );
}

function CandidateRow({
  c,
  occKey,
  onAssign,
}: {
  c: Candidate;
  occKey: string;
  onAssign: (occKey: string, pid: string) => void;
}) {
  const { person, ev } = c;
  return (
    <div
      className={
        ev.ok
          ? "border border-border rounded-lg p-2.5 hover:border-[var(--primary)]/50 hover:bg-primary-soft/40 transition-colors"
          : "border border-border rounded-lg p-2.5 bg-surface-2/40"
      }
    >
      <div className="flex items-center gap-2">
        <StatusPill status={person.status} />
        <span className="text-[13px] font-medium flex-1 min-w-0 leading-tight">
          {person.nom}
        </span>
        <SexMarker sex={person.sex} />
        {ev.ok && (
          <span className="text-[11px] font-semibold text-primary-soft-fg bg-primary-soft border border-[var(--primary)]/25 rounded px-1.5 py-0.5">
            {Math.round(ev.score)}
          </span>
        )}
      </div>
      <p
        className={
          "text-[11px] mt-1.5 leading-snug " +
          (ev.ok ? "text-text-muted" : "text-danger")
        }
      >
        {ev.ok ? ev.reasons.slice(0, 3).join(" · ") : ev.hard.join(" · ")}
      </p>
      <Button
        variant={ev.ok ? "primary" : "outline"}
        size="sm"
        className="w-full mt-2"
        onClick={() => onAssign(occKey, person.id)}
      >
        {ev.ok ? "Assignar" : "Assignar igualment"}
      </Button>
    </div>
  );
}

function Body({
  occ,
  db,
  onAssign,
}: {
  occ: Occurrence;
  db: Database;
  onAssign: (occKey: string, pid: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const current = getSeated(db, occ.key);

  const all = useMemo<Candidate[]>(
    () =>
      db.people
        .filter((p) => !current.includes(p.id))
        .map((person) => ({ person, ev: evaluate(db, person, occ, current) })),
    [db, occ, current],
  );

  const okList = useMemo(
    () => all.filter((c) => c.ev.ok).sort((a, b) => b.ev.score - a.ev.score),
    [all],
  );

  const q = query.trim().toLowerCase();

  const searchHits = useMemo(() => {
    if (!q) return [];
    return all
      .filter((c) => c.person.nom.toLowerCase().includes(q))
      .sort(
        (a, b) => Number(b.ev.ok) - Number(a.ev.ok) || b.ev.score - a.ev.score,
      );
  }, [all, q]);

  // People who could serve this date but break a rule — manual fallback.
  const availableFallback = useMemo(
    () =>
      all
        .filter((c) => available(db, c.person, occ))
        .sort((a, b) => b.ev.score - a.ev.score),
    [all, db, occ],
  );

  const pageCount = Math.ceil(okList.length / PAGE_SIZE);
  const safePage = Math.min(page, Math.max(0, pageCount - 1));
  const start = safePage * PAGE_SIZE;
  const pageItems = okList.slice(start, start + PAGE_SIZE);

  return (
    <>
      <div className="px-3 pt-3 pb-2 border-b border-border shrink-0">
        <Input
          icon={Search}
          placeholder="Cercar germà manualment…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="p-3 flex flex-col gap-2 overflow-y-auto min-h-0 flex-1">
        {q ? (
          searchHits.length ? (
            searchHits.map((c) => (
              <CandidateRow key={c.person.id} c={c} occKey={occ.key} onAssign={onAssign} />
            ))
          ) : (
            <Hint>Cap germà coincideix amb la cerca.</Hint>
          )
        ) : okList.length ? (
          pageItems.map((c) => (
            <CandidateRow key={c.person.id} c={c} occKey={occ.key} onAssign={onAssign} />
          ))
        ) : (
          <>
            <div className="rounded-md bg-warning-soft text-warning text-[12px] px-3 py-2 leading-snug">
              Cap recomanació compleix totes les regles ara mateix. Tria
              manualment un germà disponible:
            </div>
            {availableFallback.length ? (
              availableFallback.map((c) => (
                <CandidateRow key={c.person.id} c={c} occKey={occ.key} onAssign={onAssign} />
              ))
            ) : (
              <Hint>Cap germà està disponible aquesta data.</Hint>
            )}
          </>
        )}
      </div>

      {!q && okList.length > 0 && pageCount > 1 && (
        <div className="flex items-center justify-between px-2 py-2 border-t border-border shrink-0">
          <Button
            variant="ghost"
            size="sm"
            disabled={safePage === 0}
            onClick={() => setPage(safePage - 1)}
          >
            <ChevronLeft className="size-4" aria-hidden />
            Anteriors
          </Button>
          <span className="text-[12px] text-text-muted tabular-nums">
            {start + 1}–{Math.min(start + PAGE_SIZE, okList.length)} de{" "}
            {okList.length}
          </span>
          <Button
            variant="ghost"
            size="sm"
            disabled={safePage >= pageCount - 1}
            onClick={() => setPage(safePage + 1)}
          >
            Següents
            <ChevronRight className="size-4" aria-hidden />
          </Button>
        </div>
      )}
    </>
  );
}
