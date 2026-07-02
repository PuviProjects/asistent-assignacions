import {
  STATUS_RANK,
  type Database,
  type Occurrence,
  type Person,
  type Status,
} from "@/types";
import {
  isoDate,
  monthKey,
  parseMonthKey,
  prevMonthKey,
  slotsOfMonth,
} from "./dates";

/* =========================================================================
   ASSIGNMENT ENGINE
   Pure functions operating on a Database snapshot. Migrated and typed from
   the original planificador.html. No global state, no side effects.
   ========================================================================= */

export interface EvalResult {
  ok: boolean;
  /** Hard blocking reasons (rule violations). */
  hard: string[];
  score: number;
  /** Soft notes explaining the score, for the UI. */
  reasons: string[];
}

export interface Suggestion {
  person: Person;
  ev: EvalResult;
}

export function personById(db: Database, id: string): Person | undefined {
  return db.people.find((p) => p.id === id);
}

/** Seated person ids for an occurrence (never undefined). */
export function getSeated(db: Database, occKey: string): string[] {
  return db.plan[occKey] ?? [];
}

/** Whether two people are a preferred pair (going together is intended). */
export function arePreferred(a: Person, b: Person): boolean {
  return (a.pref ?? []).includes(b.id) || (b.pref ?? []).includes(a.id);
}

/** Whether a person is marked OFF for a specific occurrence this month. */
export function isOffMonth(
  db: Database,
  mk: string,
  pid: string,
  slotKey: string,
): boolean {
  return db.monthAvail[mk]?.[pid]?.includes(slotKey) ?? false;
}

/** Whether a date falls inside any of the person's absence ranges. */
export function isAbsent(p: Person, date: Date): boolean {
  const d = isoDate(date);
  return (p.absences ?? []).some((a) => a.from && a.to && d >= a.from && d <= a.to);
}

/** Available for a concrete occurrence (fixed slot + absences + monthly). */
export function available(db: Database, p: Person, occ: Occurrence): boolean {
  if (p.fixedOff?.includes(occ.slotId)) return false;
  if (isAbsent(p, occ.dateObj)) return false;
  if (isOffMonth(db, monthKey(occ.dateObj), p.id, occ.key)) return false;
  return true;
}

/** How many times a person is seated in a given month. */
export function countThisMonth(db: Database, mk: string, pid: string): number {
  let n = 0;
  for (const k in db.plan) {
    if (k.startsWith(mk) && db.plan[k].includes(pid)) n++;
  }
  return n;
}

/** Week numbers (within the month of `d`) where a person is already seated. */
export function assignedWeeks(db: Database, d: Date, pid: string): Set<number> {
  const weeks = new Set<number>();
  for (const o of slotsOfMonth(d)) {
    if (getSeated(db, o.key).includes(pid)) weeks.add(o.week);
  }
  return weeks;
}

/**
 * Whether a person is seated in the turn immediately before or after `occ`
 * (occurrences are chronological). Used to forbid back-to-back turns for
 * everyone — including PR — regardless of week.
 */
export function inAdjacentTurn(
  db: Database,
  occ: Occurrence,
  pid: string,
): boolean {
  const occs = slotsOfMonth(occ.dateObj);
  const i = occs.findIndex((o) => o.key === occ.key);
  if (i < 0) return false;
  const prev = occs[i - 1];
  const next = occs[i + 1];
  return (
    (!!prev && getSeated(db, prev.key).includes(pid)) ||
    (!!next && getSeated(db, next.key).includes(pid))
  );
}

/** Whether a and b were seated together anywhere in the previous month. */
export function wereTogetherLastMonth(
  db: Database,
  d: Date,
  a: string,
  b: string,
): boolean {
  const occs = slotsOfMonth(parseMonthKey(prevMonthKey(d)));
  return occs.some((o) => {
    const s = getSeated(db, o.key);
    return s.includes(a) && s.includes(b);
  });
}

/** Days since a and b were last together this month before `beforeDateNum`. */
export function daysSinceTogether(
  db: Database,
  d: Date,
  a: string,
  b: string,
  beforeDateNum: number,
): number {
  const occs = slotsOfMonth(d);
  let best = Infinity;
  for (const o of occs) {
    if (o.dateNum >= beforeDateNum) continue;
    const s = getSeated(db, o.key);
    if (s.includes(a) && s.includes(b)) {
      best = Math.min(best, beforeDateNum - o.dateNum);
    }
  }
  return best;
}

function statusReason(st: Status): string {
  return {
    PR: "PR · màxima prioritat",
    AC: "AC · prioritat mitjana",
    AO: "AO · habitual 1×/mes",
    PN: "PN · poca freqüència",
  }[st];
}

/**
 * Evaluate a candidate for an occurrence given the currently seated ids.
 * Returns hard blocks (rule violations) and a soft preference score.
 */
export function evaluate(
  db: Database,
  cand: Person,
  occ: Occurrence,
  current: string[],
): EvalResult {
  const hard: string[] = [];
  const reasons: string[] = [];
  let score = 0;
  const mk = monthKey(occ.dateObj);
  const { seatsPerSlot, statusPriority, statusTarget } = db.settings;

  if (current.includes(cand.id)) hard.push("Ja és en aquesta assignació");
  if (!available(db, cand, occ)) hard.push("No disponible aquesta data");
  // No back-to-back turns for anyone (even PR), within or across weeks.
  if (inAdjacentTurn(db, occ, cand.id)) hard.push("Ja fa el torn del costat");

  const seated = current
    .map((id) => personById(db, id))
    .filter((p): p is Person => Boolean(p));

  for (const s of seated) {
    if ((cand.inc ?? []).includes(s.id) || (s.inc ?? []).includes(cand.id)) {
      hard.push("Incompatible amb " + s.nom);
    }
  }

  // PN rule: two PN can't go together.
  if (cand.status === "PN" && seated.some((s) => s.status === "PN")) {
    hard.push("Dos PN no poden anar junts");
  }
  // PN rule: a PN must be accompanied by someone of higher status.
  const seatsLeft = seatsPerSlot - current.length - 1;
  if (cand.status === "PN") {
    const hasSuperior = seated.some(
      (s) => STATUS_RANK[s.status] > STATUS_RANK.PN,
    );
    if (!hasSuperior && seatsLeft <= 0) {
      hard.push("Un PN ha d'anar acompanyat d'algú de status superior");
    }
  }

  if (hard.length) return { ok: false, hard, score: -1, reasons };

  // ---- preference scoring ----
  score += statusPriority[cand.status];
  reasons.push(statusReason(cand.status));

  const used = countThisMonth(db, mk, cand.id);
  const target = statusTarget[cand.status];
  if (used === 0) {
    score += 40;
    reasons.push("Encara no ha sortit aquest mes");
  } else {
    score -= used * 18;
    if (used >= target) {
      score -= 25;
      reasons.push("Ja va " + used + "× aquest mes");
    } else {
      reasons.push("Va " + used + "× aquest mes");
    }
  }

  // Spread people across weeks: avoid the same person the same week (common
  // mid-week) or in consecutive weeks. Weighted by status — a PR is meant to
  // serve often (high target), so the penalty shrinks; an AO (target 1) gets
  // the full penalty. Factor = 1/target: PR≈0.17, AC≈0.33, AO/PN=1.
  const weeks = assignedWeeks(db, occ.dateObj, cand.id);
  const spreadFactor = 1 / statusTarget[cand.status];
  const showWeek = cand.status !== "PR";
  if (weeks.has(occ.week)) {
    score -= 45 * spreadFactor;
    if (showWeek) reasons.push("⚠ Ja surt aquesta setmana");
  } else if (weeks.has(occ.week - 1) || weeks.has(occ.week + 1)) {
    score -= 32 * spreadFactor;
    if (showWeek) reasons.push("⚠ Surt en una setmana seguida");
  }

  // Avoid repeating last month's pairing (especially AO).
  // Preferred partners are exempt — going together is the whole point.
  let repeatPenalty = 0;
  let repeatNote: string | null = null;
  for (const s of seated) {
    if (arePreferred(cand, s)) continue;
    if (wereTogetherLastMonth(db, occ.dateObj, cand.id, s.id)) {
      const w = cand.status === "AO" || s.status === "AO" ? 40 : 18;
      repeatPenalty += w;
      repeatNote = "Va coincidir amb " + s.nom + " el mes passat";
    }
    const dst = daysSinceTogether(db, occ.dateObj, cand.id, s.id, occ.dateNum);
    if (dst < 21) {
      repeatPenalty += 21 - dst;
      if (!repeatNote) repeatNote = "Fa poc que va amb " + s.nom;
    }
  }
  if (repeatPenalty > 0) {
    score -= repeatPenalty;
    if (repeatNote) reasons.push("⚠ " + repeatNote);
  } else if (seated.length) {
    reasons.push("Combinació nova");
  }

  // Preferred partners (e.g. couples) — strongly encourage going together.
  for (const s of seated) {
    if ((cand.pref ?? []).includes(s.id) || (s.pref ?? []).includes(cand.id)) {
      score += 60;
      reasons.push("Prefereix anar amb " + s.nom);
    }
  }

  // Favor covering the required male (baró) if missing.
  const hasMale = seated.some((s) => s.sex === "H");
  if (!hasMale) {
    if (cand.sex === "H") {
      score += 22;
      reasons.push("Aporta el baró necessari");
    } else if (seatsLeft <= 0) {
      return {
        ok: false,
        hard: ["Cal almenys un baró i aquest seria l'últim lloc"],
        score: -1,
        reasons: [],
      };
    }
  }

  return { ok: true, hard: [], score, reasons };
}

/** Validation warnings for a fully/partially seated occurrence. */
export function slotWarnings(db: Database, occ: Occurrence): string[] {
  const seated = getSeated(db, occ.key)
    .map((id) => personById(db, id))
    .filter((p): p is Person => Boolean(p));
  const w: string[] = [];

  if (
    seated.length === db.settings.seatsPerSlot &&
    !seated.some((s) => s.sex === "H")
  ) {
    w.push("Cap baró en aquesta assignació");
  }
  if (seated.filter((s) => s.status === "PN").length >= 2) {
    w.push("Dos PN junts");
  }
  for (const pn of seated.filter((s) => s.status === "PN")) {
    if (!seated.some((s) => STATUS_RANK[s.status] > STATUS_RANK.PN)) {
      w.push(pn.nom + " (PN) sense acompanyant de status superior");
    }
  }
  for (let i = 0; i < seated.length; i++) {
    for (let j = i + 1; j < seated.length; j++) {
      const a = seated[i];
      const b = seated[j];
      if ((a.inc ?? []).includes(b.id)) {
        w.push(a.nom + " i " + b.nom + " són incompatibles");
      }
    }
  }
  return [...new Set(w)];
}

export interface SeatFlag {
  text: string;
  severity: "danger" | "warning";
}

/**
 * Per-person issues for a seated person in a specific occurrence — used to
 * surface inline signals on their chip (rule breaks vs soft warnings).
 */
export function seatFlags(
  db: Database,
  occ: Occurrence,
  pid: string,
): SeatFlag[] {
  const person = personById(db, pid);
  if (!person) return [];
  const flags: SeatFlag[] = [];

  if (isAbsent(person, occ.dateObj)) {
    flags.push({ text: "Absent aquesta data", severity: "danger" });
  }

  const others = getSeated(db, occ.key)
    .filter((id) => id !== pid)
    .map((id) => personById(db, id))
    .filter((p): p is Person => Boolean(p));

  for (const o of others) {
    if ((person.inc ?? []).includes(o.id) || (o.inc ?? []).includes(person.id)) {
      flags.push({ text: "Incompatible amb " + o.nom, severity: "danger" });
    }
  }
  if (person.status === "PN") {
    if (others.some((o) => o.status === "PN")) {
      flags.push({ text: "Dos PN junts", severity: "danger" });
    }
    if (!others.some((o) => STATUS_RANK[o.status] > STATUS_RANK.PN)) {
      flags.push({ text: "PN sense status superior", severity: "danger" });
    }
  }

  const mk = monthKey(occ.dateObj);
  const used = countThisMonth(db, mk, pid);
  const target = db.settings.statusTarget[person.status];
  if (used > target) {
    flags.push({
      text: `Va ${used}× aquest mes (objectiu ${target})`,
      severity: "warning",
    });
  }

  // Week-spread signals (same week / consecutive weeks). Skipped for PR, who
  // are expected to serve often — only flagged for lower-target germans.
  if (person.status !== "PR") {
    const weekCounts = new Map<number, number>();
    for (const o of slotsOfMonth(occ.dateObj)) {
      if (getSeated(db, o.key).includes(pid)) {
        weekCounts.set(o.week, (weekCounts.get(o.week) ?? 0) + 1);
      }
    }
    const sameWeek = weekCounts.get(occ.week) ?? 0;
    if (sameWeek >= 2) {
      flags.push({
        text: `Surt ${sameWeek}× aquesta setmana`,
        severity: "warning",
      });
    }
    if (weekCounts.has(occ.week - 1) || weekCounts.has(occ.week + 1)) {
      flags.push({ text: "Surt en setmanes seguides", severity: "warning" });
    }
  }

  for (const o of others) {
    // Preferred partners going together is intended — never flag it.
    if (arePreferred(person, o)) continue;
    if (wereTogetherLastMonth(db, occ.dateObj, pid, o.id)) {
      flags.push({
        text: "Repeteix amb " + o.nom + " (mes passat)",
        severity: "warning",
      });
    } else if (daysSinceTogether(db, occ.dateObj, pid, o.id, occ.dateNum) < 21) {
      flags.push({ text: "Fa poc amb " + o.nom, severity: "warning" });
    }
  }

  return flags;
}

/** Ranked, valid candidate suggestions for an occurrence's open seat. */
export function suggestionsFor(db: Database, occ: Occurrence): Suggestion[] {
  const current = getSeated(db, occ.key);
  return db.people
    .filter((p) => !current.includes(p.id))
    .map((p) => ({ person: p, ev: evaluate(db, p, occ, current) }))
    .filter((x) => x.ev.ok)
    .sort((a, b) => b.ev.score - a.ev.score);
}

/**
 * Greedy auto-assignment for a whole month. Returns a NEW plan map; does not
 * mutate the input. Fills every occurrence up to SEATS_PER_SLOT, prioritizing
 * the required male (baró).
 */
export function autoAssignMonth(
  db: Database,
  month: Date,
): Database["plan"] {
  const occs = slotsOfMonth(month);
  const seatsPerSlot = db.settings.seatsPerSlot;
  const plan: Database["plan"] = { ...db.plan };
  for (const o of occs) plan[o.key] = [...(plan[o.key] ?? [])];

  // Working db reflects in-progress seats so evaluate sees them.
  const working: Database = { ...db, plan };

  for (const occ of occs) {
    let guard = 0;
    while (plan[occ.key].length < seatsPerSlot && guard < 30) {
      guard++;
      const current = plan[occ.key];
      const seatsLeft = seatsPerSlot - current.length;
      const hasMale = current
        .map((id) => personById(db, id))
        .some((s) => s?.sex === "H");

      let cands = db.people
        .filter((p) => !current.includes(p.id))
        .map((p) => ({ person: p, ev: evaluate(working, p, occ, current) }))
        .filter((x) => x.ev.ok);

      // Last seat with no male yet → males only.
      if (seatsLeft === 1 && !hasMale) {
        cands = cands.filter((x) => x.person.sex === "H");
      }
      // No male yet → strongly prefer males.
      if (!hasMale) {
        cands.sort(
          (a, b) =>
            Number(b.person.sex === "H") - Number(a.person.sex === "H") ||
            b.ev.score - a.ev.score,
        );
      } else {
        cands.sort((a, b) => b.ev.score - a.ev.score);
      }

      if (!cands.length) break;
      plan[occ.key].push(cands[0].person.id);
    }
  }

  return plan;
}
