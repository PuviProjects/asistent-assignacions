import { create } from "zustand";
import { persist } from "zustand/middleware";
import { defaultSettings, type Database, type Person, type Settings } from "@/types";
import { monthKey } from "@/lib/dates";
import { autoAssignMonth } from "@/lib/planning";
import { seed, uid } from "@/lib/seed";

/* =========================================================================
   APPLICATION STORE (Zustand + localStorage persistence)
   Holds the Database and all mutating actions. The assignment engine in
   lib/planning.ts stays pure; the store wires it to persisted state.
   ========================================================================= */

/** Editable fields of a person (everything except the id). */
export type PersonInput = Pick<
  Person,
  "nom" | "sex" | "status" | "fixedOff" | "inc" | "pref" | "absences"
>;

interface DbStore extends Database {
  /* ---- people ---- */
  addPerson: (input: PersonInput) => void;
  updatePerson: (id: string, input: PersonInput) => void;
  removePerson: (id: string) => void;

  /* ---- monthly availability ---- */
  toggleOffMonth: (mk: string, pid: string, slotKey: string) => void;

  /* ---- planning ---- */
  seatPerson: (occKey: string, pid: string) => void;
  unseatPerson: (occKey: string, pid: string) => void;
  /** Move a seated person to another slot, or swap with the target person. */
  moveSeat: (
    from: { occKey: string; pid: string },
    to: { occKey: string; pid?: string },
  ) => void;
  clearMonth: (mk: string) => void;
  runAutoAssign: (month: Date) => void;

  /* ---- settings ---- */
  updateSettings: (patch: Partial<Settings>) => void;
  /**
   * Change seats-per-assignment. When reducing, any occurrence holding more
   * people than the new capacity is truncated (the last-added overflow is
   * dropped) so stored plans never exceed — and never invisibly count past —
   * the visible capacity.
   */
  setSeatsPerSlot: (n: number) => void;

  /* ---- whole-db ---- */
  exportDatabase: () => Database;
  importDatabase: (db: Database) => void;
  resetToSeed: () => void;
}

export const useDb = create<DbStore>()(
  persist(
    (set, get) => ({
      ...seed(),

      addPerson: (input) =>
        set((state) => {
          const np: Person = { id: uid(), ...input };
          const people = state.people.map((p) => {
            const patch: Partial<Person> = {};
            if (input.inc.includes(p.id))
              patch.inc = [...new Set([...p.inc, np.id])];
            if (input.pref.includes(p.id))
              patch.pref = [...new Set([...p.pref, np.id])];
            return Object.keys(patch).length ? { ...p, ...patch } : p;
          });
          return { people: [...people, np] };
        }),

      updatePerson: (id, input) =>
        set((state) => ({
          people: state.people.map((p) => {
            if (p.id === id) return { ...p, ...input };
            // Keep the incompatibility and preference relations symmetric.
            const inc = p.inc.filter((x) => x !== id);
            if (input.inc.includes(p.id)) inc.push(id);
            const pref = p.pref.filter((x) => x !== id);
            if (input.pref.includes(p.id)) pref.push(id);
            return { ...p, inc, pref };
          }),
        })),

      removePerson: (id) =>
        set((state) => ({
          people: state.people
            .filter((p) => p.id !== id)
            .map((p) => ({
              ...p,
              inc: p.inc.filter((x) => x !== id),
              pref: p.pref.filter((x) => x !== id),
            })),
          plan: Object.fromEntries(
            Object.entries(state.plan).map(([k, v]) => [
              k,
              v.filter((x) => x !== id),
            ]),
          ),
        })),

      toggleOffMonth: (mk, pid, slotKey) =>
        set((state) => {
          const arr = [...(state.monthAvail[mk]?.[pid] ?? [])];
          const i = arr.indexOf(slotKey);
          if (i >= 0) arr.splice(i, 1);
          else arr.push(slotKey);
          return {
            monthAvail: {
              ...state.monthAvail,
              [mk]: { ...(state.monthAvail[mk] ?? {}), [pid]: arr },
            },
          };
        }),

      seatPerson: (occKey, pid) =>
        set((state) => {
          const cur = state.plan[occKey] ?? [];
          if (cur.length >= state.settings.seatsPerSlot || cur.includes(pid))
            return state;
          return { plan: { ...state.plan, [occKey]: [...cur, pid] } };
        }),

      unseatPerson: (occKey, pid) =>
        set((state) => ({
          plan: {
            ...state.plan,
            [occKey]: (state.plan[occKey] ?? []).filter((x) => x !== pid),
          },
        })),

      moveSeat: (from, to) =>
        set((state) => {
          if (from.occKey === to.occKey) return state;
          const source = [...(state.plan[from.occKey] ?? [])];
          const target = [...(state.plan[to.occKey] ?? [])];
          if (!source.includes(from.pid)) return state;
          if (target.includes(from.pid)) return state;
          if (to.pid) {
            // Swap the two people across slots.
            if (!target.includes(to.pid)) return state;
            source[source.indexOf(from.pid)] = to.pid;
            target[target.indexOf(to.pid)] = from.pid;
          } else {
            // Move into a free seat.
            if (target.length >= state.settings.seatsPerSlot) return state;
            source.splice(source.indexOf(from.pid), 1);
            target.push(from.pid);
          }
          return {
            plan: { ...state.plan, [from.occKey]: source, [to.occKey]: target },
          };
        }),

      clearMonth: (mk) =>
        set((state) => {
          const plan = { ...state.plan };
          for (const k in plan) if (k.startsWith(mk)) delete plan[k];
          return { plan };
        }),

      runAutoAssign: (month) =>
        set((state) => ({
          plan: autoAssignMonth(
            {
              people: state.people,
              monthAvail: state.monthAvail,
              plan: state.plan,
              settings: state.settings,
            },
            month,
          ),
        })),

      updateSettings: (patch) =>
        set((state) => ({ settings: { ...state.settings, ...patch } })),

      setSeatsPerSlot: (n) =>
        set((state) => {
          const plan: Database["plan"] = {};
          for (const k in state.plan) {
            const arr = state.plan[k];
            plan[k] = arr.length > n ? arr.slice(0, n) : arr;
          }
          return { settings: { ...state.settings, seatsPerSlot: n }, plan };
        }),

      exportDatabase: () => {
        const { people, monthAvail, plan, settings } = get();
        return { people, monthAvail, plan, settings };
      },

      importDatabase: (db) =>
        set({
          people: (db.people ?? []).map(normalizePerson),
          monthAvail: db.monthAvail ?? {},
          plan: db.plan ?? {},
          settings: normalizeSettings(db.settings),
        }),

      resetToSeed: () => set(seed()),
    }),
    {
      name: "planif-store",
      version: 4,
      // Persist only the data, never the action functions.
      partialize: (state): Database => ({
        people: state.people,
        monthAvail: state.monthAvail,
        plan: state.plan,
        settings: state.settings,
      }),
      // Backfill fields added in later versions on older persisted data.
      migrate: (persisted) => {
        const db = persisted as Partial<Database>;
        return {
          people: (db.people ?? []).map(normalizePerson),
          monthAvail: db.monthAvail ?? {},
          plan: db.plan ?? {},
          settings: normalizeSettings(db.settings),
        } as Database;
      },
    },
  ),
);

/** Merge (possibly partial/absent) settings with the factory defaults. */
function normalizeSettings(s: Partial<Settings> | undefined): Settings {
  const d = defaultSettings();
  return {
    seatsPerSlot: s?.seatsPerSlot ?? d.seatsPerSlot,
    statusPriority: { ...d.statusPriority, ...s?.statusPriority },
    statusTarget: { ...d.statusTarget, ...s?.statusTarget },
  };
}

/** Ensure a person has all array fields (defensive for imports/migrations). */
function normalizePerson(p: Person): Person {
  return {
    ...p,
    fixedOff: p.fixedOff ?? [],
    inc: p.inc ?? [],
    pref: p.pref ?? [],
    absences: p.absences ?? [],
  };
}

/** Convenience: current month key for "today". */
export function currentMonthKey(): string {
  return monthKey(new Date());
}
