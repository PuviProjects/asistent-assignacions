import type { Occurrence, SlotDef } from "@/types";

/* =========================================================================
   SLOT DEFINITIONS & DATE UTILITIES
   Migrated from the original planificador.html.
   ========================================================================= */

/** Recurring weekly slots. `day` matches Date.getDay() (0 = Sunday). */
export const SLOT_DEFS: SlotDef[] = [
  { id: "ma-mt", day: 2, label: "Dimarts", time: "09:00–14:00", tag: "matí" },
  { id: "ta-mt", day: 2, label: "Dimarts", time: "16:00–20:00", tag: "tarda" },
  { id: "di-vn", day: 5, label: "Divendres", time: "17:30–20:00", tag: "tarda" },
  { id: "ma-ds", day: 6, label: "Dissabte", time: "09:00–13:00", tag: "matí" },
];

export const MONTHS_CA = [
  "Gener",
  "Febrer",
  "Març",
  "Abril",
  "Maig",
  "Juny",
  "Juliol",
  "Agost",
  "Setembre",
  "Octubre",
  "Novembre",
  "Desembre",
];

export const DAYNAME = ["Dg", "Dl", "Dt", "Dc", "Dj", "Dv", "Ds"];

/** `2026-06` style key for a given date's month. */
export function monthKey(d: Date): string {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
}

/** Local ISO date (YYYY-MM-DD) for a Date. */
export function isoDate(d: Date): string {
  return (
    d.getFullYear() +
    "-" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(d.getDate()).padStart(2, "0")
  );
}

/** Human-readable month label, e.g. "Juny 2026". */
export function monthLabel(d: Date): string {
  return MONTHS_CA[d.getMonth()] + " " + d.getFullYear();
}

/** First day of the month encoded by a month key. */
export function parseMonthKey(mk: string): Date {
  const [y, m] = mk.split("-").map(Number);
  return new Date(y, m - 1, 1);
}

/** Month key of the month before `d`. */
export function prevMonthKey(d: Date): string {
  const x = new Date(d);
  x.setMonth(x.getMonth() - 1);
  return monthKey(x);
}

/** First day of the month `delta` months away from `month`. */
export function shiftMonth(month: Date, delta: number): Date {
  const d = new Date(month);
  d.setDate(1);
  d.setMonth(d.getMonth() + delta);
  return d;
}

/** All slot occurrences within the month of `d`, in chronological order. */
export function slotsOfMonth(d: Date): Occurrence[] {
  const y = d.getFullYear();
  const m = d.getMonth();
  const days = new Date(y, m + 1, 0).getDate();
  const mk = monthKey(d);
  const out: Occurrence[] = [];
  for (let day = 1; day <= days; day++) {
    const dt = new Date(y, m, day);
    const wd = dt.getDay();
    for (const s of SLOT_DEFS) {
      if (s.day === wd) {
        // Week number within the month based on ISO weeks (Monday = start of week).
        const firstDow = new Date(y, m, 1).getDay(); // 0=Sun..6=Sat
        const mondayOffset = firstDow === 0 ? 6 : firstDow - 1; // days before first Monday
        const week = Math.ceil((day + mondayOffset) / 7);
        out.push({
          key: mk + "_" + s.id + "_" + day,
          slotId: s.id,
          dateNum: day,
          weekday: wd,
          label: s.label,
          time: s.time,
          tag: s.tag,
          dateObj: dt,
          week,
        });
      }
    }
  }
  return out;
}
