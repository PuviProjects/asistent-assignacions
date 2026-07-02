/* =========================================================================
   DOMAIN MODEL
   ========================================================================= */

/** Status / appointment of a brother or sister. Ordered by hierarchy. */
export type Status = "PR" | "AC" | "AO" | "PN";

/** Biological sex marker used by the assignment rules (baró requirement). */
export type Sex = "H" | "D";

/** Identifier of a recurring weekly slot definition (e.g. "ma-mt"). */
export type SlotId = string;

export interface Person {
  id: string;
  /** Full name. */
  nom: string;
  sex: Sex;
  status: Status;
  /** Slot definitions this person can never take (fixed unavailability). */
  fixedOff: SlotId[];
  /** Ids of people this person must never be paired with. */
  inc: string[];
  /** Ids of people this person should preferably go with (e.g. couples). */
  pref: string[];
  /** Date ranges (e.g. holidays) during which the person is unavailable. */
  absences: AbsenceRange[];
}

/** An inclusive date range during which a person is unavailable. */
export interface AbsenceRange {
  /** ISO date, YYYY-MM-DD. */
  from: string;
  /** ISO date, YYYY-MM-DD. */
  to: string;
}

/** A recurring weekly slot definition. */
export interface SlotDef {
  id: SlotId;
  /** Day of week, 0 = Sunday … 6 = Saturday (matches Date.getDay). */
  day: number;
  label: string;
  /** Human-readable time range, e.g. "09:00–14:00". */
  time: string;
  /** Period tag. */
  tag: "matí" | "tarda";
}

/** Tunable planning parameters, editable from the Configuració view. */
export interface Settings {
  /** Seats (people) per assignment occurrence. */
  seatsPerSlot: number;
  /** Weight per status when ranking candidates (higher = more preferred). */
  statusPriority: Record<Status, number>;
  /** Orientative assignments per month, per status. */
  statusTarget: Record<Status, number>;
}

/** Persisted application state. */
export interface Database {
  people: Person[];
  /** monthAvail[monthKey][personId] = slotKeys the person is OFF. */
  monthAvail: Record<string, Record<string, string[]>>;
  /** plan[occurrenceKey] = seated person ids (max settings.seatsPerSlot). */
  plan: Record<string, string[]>;
  /** Tunable planning parameters. */
  settings: Settings;
}

/** A concrete occurrence of a slot on a specific date of a month. */
export interface Occurrence {
  /** Unique key: `${monthKey}_${slotId}_${dateNum}`. */
  key: string;
  slotId: SlotId;
  /** Day of month, 1-based. */
  dateNum: number;
  /** Day of week, 0 = Sunday … 6 = Saturday. */
  weekday: number;
  label: string;
  time: string;
  tag: SlotDef["tag"];
  dateObj: Date;
  /** 1-based week of the month. */
  week: number;
}

/** Default seats per occurrence (used when settings are unset). */
export const SEATS_PER_SLOT = 3;

/** Allowed range for the configurable seats-per-assignment. */
export const SEATS_MIN = 1;
export const SEATS_MAX = 6;

/** Ordered statuses, from most to least senior — for config UIs. */
export const STATUS_ORDER: Status[] = ["PR", "AC", "AO", "PN"];

/* ---------- Display metadata ---------- */

export const STATUS_LABEL: Record<Status, string> = {
  PR: "Precursor Regular",
  AC: "Precursor Auxiliar Continu",
  AO: "Altres Ovelles",
  PN: "Publicador No Batejat",
};

/** Hierarchy rank — higher means more senior (used by the PN rule). */
export const STATUS_RANK: Record<Status, number> = {
  PR: 4,
  AC: 3,
  AO: 2,
  PN: 1,
};

/** Weight when suggesting candidates. */
export const STATUS_PRIORITY: Record<Status, number> = {
  PR: 100,
  AC: 55,
  AO: 30,
  PN: 8,
};

/** Orientative assignments per month. */
export const STATUS_TARGET: Record<Status, number> = {
  PR: 6,
  AC: 3,
  AO: 1,
  PN: 1,
};

/** Factory defaults for the tunable planning parameters. */
export function defaultSettings(): Settings {
  return {
    seatsPerSlot: SEATS_PER_SLOT,
    statusPriority: { ...STATUS_PRIORITY },
    statusTarget: { ...STATUS_TARGET },
  };
}

export const SEX_LABEL: Record<Sex, string> = {
  H: "Home",
  D: "Dona",
};
