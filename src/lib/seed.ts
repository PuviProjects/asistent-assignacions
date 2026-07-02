import { defaultSettings, type Database, type Person, type Sex, type SlotId, type Status } from "@/types";

/** Short random id, prefixed to keep it readable. */
export function uid(): string {
  return "h" + Math.random().toString(36).slice(2, 9);
}

/**
 * Real roster (congregation PPOC Vic), imported from
 * "DISPONIBILITAT PPOC VIC.xlsx" on 2026-06-18.
 * Tuple: [name, sex, status, fixedOff slots]. Sex was inferred from first
 * names; fixedOff comes from the availability grid (slots never available).
 * Disabled (red) people from the sheet are intentionally excluded.
 */
const ROSTER: [string, Sex, Status, SlotId[]][] = [
  ["Xavier Atxer", "H", "AO", []],
  ["Rosa Prat Atxer", "D", "AO", []],
  ["Aumatell, Sara", "D", "PR", ["ma-mt"]],
  ["Llorenç Segalés", "H", "PR", ["ma-mt"]],
  ["Laura Durán", "D", "PR", ["ma-mt", "di-vn"]],
  ["Pau Gonzàlez", "H", "PR", ["ma-mt", "ta-mt"]],
  ["Sarai Vivancos", "D", "PR", ["ma-mt", "ma-ds"]],
  ["Mª Àngels Mínguez", "D", "AO", []],
  ["Noa Víctor", "D", "PR", ["ma-mt", "ta-mt"]],
  ["Carme Arnella", "D", "AO", ["ta-mt", "di-vn"]],
  ["Aumatell, Montserrat Soler", "D", "AO", ["ma-mt", "ta-mt", "di-vn", "ma-ds"]],
  ["Mercè Sallen Martín", "D", "AO", ["ma-mt", "ta-mt", "di-vn"]],
  ["Albert Calasanz", "H", "AO", ["ma-mt"]],
  ["Aarón Calasanz", "H", "AO", ["ma-mt", "ta-mt", "di-vn"]],
  ["Rodri Durán Asamara", "H", "AO", ["ma-ds"]],
  ["Maite Sardañés", "D", "AO", ["ma-ds"]],
  ["Marissa Ruiviejo", "D", "AO", ["ta-mt", "di-vn", "ma-ds"]],
  ["Carmen García", "D", "AO", ["ta-mt", "di-vn", "ma-ds"]],
  ["Adela González", "D", "AO", ["ma-ds"]],
  ["Lawal, Victòria", "D", "PR", ["ma-mt", "di-vn"]],
  ["Llaguerri, Oriol", "H", "AO", ["ma-mt", "ta-mt", "di-vn"]],
  ["Llaguerri, Natzaret", "D", "AO", ["ma-mt", "ta-mt", "di-vn"]],
  ["Rosita d’Obama", "D", "AO", ["ta-mt", "di-vn"]],
  ["Rafael Pérez", "H", "AO", []],
  ["Rosa Valenzuela", "D", "AO", ["ma-mt"]],
  ["Josep Povedano", "H", "AO", ["ma-mt", "ta-mt", "di-vn"]],
  ["Aleix Povedano", "H", "AO", ["ma-mt", "ta-mt", "di-vn"]],
  ["Jana Povedano", "D", "AO", ["ma-mt", "ta-mt", "di-vn"]],
  ["Adrià Povedano", "H", "AO", ["ma-mt", "ta-mt", "di-vn"]],
  ["Itzíar Linde", "D", "AO", ["ma-mt", "ta-mt", "di-vn"]],
  ["Ricart Mateu, Joan", "H", "AO", ["ma-mt", "ta-mt", "di-vn", "ma-ds"]],
  ["Luís Valle", "H", "PR", ["ma-mt", "ta-mt"]],
  ["Vila Criach, Olga", "D", "AO", ["ma-mt", "di-vn"]],
  ["Dan Cuesta", "H", "PR", ["ma-mt"]],
  ["Paula de Cuesta", "D", "PR", ["ma-mt"]],
  ["Mireia Duran", "D", "PR", ["ma-mt"]],
  ["Pep Viñas", "H", "AO", ["ta-mt", "di-vn", "ma-ds"]],
  ["Trini Viñas", "D", "AO", ["ta-mt", "di-vn", "ma-ds"]],
];

/** Preferred-partner pairs (by name) from the sheet's "Possar-los junts" notes. */
const PREF_PAIRS: [string, string][] = [["Xavier Atxer", "Rosa Prat Atxer"]];

/** Initial dataset for a fresh install. */
export function seed(): Database {
  const people: Person[] = ROSTER.map(([nom, sex, status, fixedOff]) => ({
    id: uid(),
    nom,
    sex,
    status,
    fixedOff: [...fixedOff],
    inc: [],
    pref: [],
    absences: [],
  }));

  const byName = (n: string) => people.find((p) => p.nom === n);
  for (const [a, b] of PREF_PAIRS) {
    const pa = byName(a);
    const pb = byName(b);
    if (pa && pb) {
      pa.pref.push(pb.id);
      pb.pref.push(pa.id);
    }
  }

  return { people, monthAvail: {}, plan: {}, settings: defaultSettings() };
}
