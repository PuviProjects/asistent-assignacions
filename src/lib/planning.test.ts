import { describe, expect, it } from "vitest";
import type { Database, Person } from "@/types";
import { defaultSettings, SEATS_PER_SLOT } from "@/types";
import { slotsOfMonth } from "./dates";
import {
  autoAssignMonth,
  evaluate,
  seatFlags,
  slotWarnings,
  suggestionsFor,
} from "./planning";

function person(id: string, over: Partial<Person> = {}): Person {
  return {
    id,
    nom: id,
    sex: "H",
    status: "AO",
    fixedOff: [],
    inc: [],
    pref: [],
    absences: [],
    ...over,
  };
}

function db(people: Person[], plan: Database["plan"] = {}): Database {
  return { people, monthAvail: {}, plan, settings: defaultSettings() };
}

/** June 2026: a Tuesday (slots ma-mt, ta-mt) falls on the 2nd. */
const MONTH = new Date(2026, 5, 1);
const occ = slotsOfMonth(MONTH).find((o) => o.slotId === "ma-mt")!;

describe("slotsOfMonth", () => {
  it("emits the four weekly slots across the month", () => {
    const occs = slotsOfMonth(MONTH);
    expect(occs.length).toBeGreaterThan(0);
    expect(new Set(occs.map((o) => o.slotId))).toEqual(
      new Set(["ma-mt", "ta-mt", "di-vn", "ma-ds"]),
    );
    // Tuesday slots must land on a Tuesday (weekday 2).
    expect(occs.filter((o) => o.slotId === "ma-mt").every((o) => o.weekday === 2)).toBe(true);
  });
});

describe("evaluate — hard rules", () => {
  it("blocks two PN together", () => {
    const a = person("a", { status: "PN" });
    const b = person("b", { status: "PN" });
    const d = db([a, b]);
    expect(evaluate(d, b, occ, ["a"]).hard).toContain("Dos PN no poden anar junts");
  });

  it("blocks incompatible pairs symmetrically", () => {
    const a = person("a");
    const b = person("b", { inc: ["a"] });
    const d = db([a, b]);
    expect(evaluate(d, a, occ, ["b"]).ok).toBe(false);
  });

  it("blocks people unavailable on a fixed slot", () => {
    const a = person("a", { fixedOff: ["ma-mt"] });
    expect(evaluate(db([a]), a, occ, []).hard).toContain("No disponible aquesta data");
  });

  it("blocks people inside an absence range (and not outside it)", () => {
    const iso = (d: Date) =>
      d.getFullYear() +
      "-" +
      String(d.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(d.getDate()).padStart(2, "0");
    const day = iso(occ.dateObj);
    const absent = person("a", { absences: [{ from: day, to: day }] });
    expect(evaluate(db([absent]), absent, occ, []).ok).toBe(false);
    const free = person("b", {
      absences: [{ from: "2020-01-01", to: "2020-01-02" }],
    });
    expect(evaluate(db([free]), free, occ, []).ok).toBe(true);
  });

  it("requires a baró on the last empty seat", () => {
    const women = [person("w1", { sex: "D" }), person("w2", { sex: "D" }), person("w3", { sex: "D" })];
    const d = db(women);
    const res = evaluate(d, women[2], occ, ["w1", "w2"]);
    expect(res.ok).toBe(false);
  });
});

describe("preferred partners", () => {
  it("scores higher when a preferred partner is already seated", () => {
    const a = person("a", { pref: ["b"] });
    const b = person("b", { pref: ["a"] });
    const c = person("c");
    const withPartner = evaluate(db([a, b, c]), a, occ, ["b"]);
    const withStranger = evaluate(db([a, b, c]), a, occ, ["c"]);
    expect(withPartner.score).toBeGreaterThan(withStranger.score);
    expect(withPartner.reasons.some((r) => r.includes("Prefereix"))).toBe(true);
  });
});

describe("seatFlags — preferred partners", () => {
  // Same pair seated together this month and last month.
  const prevOcc = slotsOfMonth(new Date(2026, 4, 1)).find(
    (o) => o.slotId === "ma-mt",
  )!;
  const plan = { [occ.key]: ["a", "b"], [prevOcc.key]: ["a", "b"] };

  it("does NOT flag a repeated pairing when they are a preferred pair", () => {
    const a = person("a", { pref: ["b"] });
    const b = person("b", { pref: ["a"] });
    const flags = seatFlags(db([a, b], plan), occ, "a");
    expect(flags.some((f) => f.text.includes("Repeteix"))).toBe(false);
  });

  it("still flags a repeated pairing for non-preferred people", () => {
    const a = person("a");
    const b = person("b");
    const flags = seatFlags(db([a, b], plan), occ, "a");
    expect(flags.some((f) => f.text.includes("Repeteix"))).toBe(true);
  });
});

describe("week spacing", () => {
  const tuesdays = slotsOfMonth(MONTH).filter((o) => o.slotId === "ma-mt");
  const w1 = tuesdays[0];
  const w2 = tuesdays[1]; // the following week
  // Same week but NOT an adjacent turn (Tuesday morning vs Saturday morning).
  const dsSameWeek = slotsOfMonth(MONTH).find(
    (o) => o.slotId === "ma-ds" && o.week === w1.week,
  )!;

  it("penalizes appearing again in the same week (non-adjacent turns)", () => {
    const x = person("x");
    const ev = evaluate(db([x], { [dsSameWeek.key]: ["x"] }), x, w1, []);
    expect(ev.reasons.some((r) => r.includes("aquesta setmana"))).toBe(true);
  });

  it("flags a consecutive week lower than a fresh one", () => {
    const x = person("x");
    const plan = { [w1.key]: ["x"] };
    const consecutive = evaluate(db([x], plan), x, w2, []);
    expect(consecutive.reasons.some((r) => r.includes("seguida"))).toBe(true);
  });

  it("seatFlags warns about consecutive weeks", () => {
    const x = person("x");
    const plan = { [w1.key]: ["x"], [w2.key]: ["x"] };
    const flags = seatFlags(db([x], plan), w2, "x");
    expect(flags.some((f) => f.text.includes("setmanes seguides"))).toBe(true);
  });

  it("is status-aware: nags AO but not PR about consecutive weeks", () => {
    const pr = person("p", { status: "PR" });
    const ao = person("a", { status: "AO" });
    const evPR = evaluate(db([pr], { [w1.key]: ["p"] }), pr, w2, []);
    const evAO = evaluate(db([ao], { [w1.key]: ["a"] }), ao, w2, []);
    expect(evPR.reasons.some((r) => r.includes("seguida"))).toBe(false);
    expect(evAO.reasons.some((r) => r.includes("seguida"))).toBe(true);
    // And the PR's seated chip is not flagged for it.
    const prPlan = { [w1.key]: ["p"], [w2.key]: ["p"] };
    expect(
      seatFlags(db([pr], prPlan), w2, "p").some((f) =>
        f.text.includes("setmanes seguides"),
      ),
    ).toBe(false);
  });
});

describe("back-to-back turns", () => {
  const occs = slotsOfMonth(MONTH);

  it("blocks a person from the immediately adjacent turn (even PR)", () => {
    const x = person("x", { status: "PR" });
    const ev = evaluate(db([x], { [occs[0].key]: ["x"] }), x, occs[1], []);
    expect(ev.ok).toBe(false);
    expect(ev.hard.some((h) => h.includes("torn"))).toBe(true);
  });

  it("allows a non-adjacent turn", () => {
    const x = person("x");
    const ev = evaluate(db([x], { [occs[0].key]: ["x"] }), x, occs[2], []);
    expect(ev.hard.some((h) => h.includes("torn"))).toBe(false);
  });
});

describe("suggestionsFor", () => {
  it("ranks PR above AO by priority", () => {
    const pr = person("pr", { status: "PR" });
    const ao = person("ao", { status: "AO" });
    const ranked = suggestionsFor(db([pr, ao]), occ);
    expect(ranked[0].person.id).toBe("pr");
  });
});

describe("autoAssignMonth", () => {
  it("never seats more than the max and always includes a baró when full", () => {
    const people = [
      person("m1", { sex: "H", status: "PR" }),
      person("m2", { sex: "H", status: "AC" }),
      person("f1", { sex: "D", status: "PR" }),
      person("f2", { sex: "D", status: "AC" }),
      person("f3", { sex: "D", status: "AO" }),
      person("m3", { sex: "H", status: "AO" }),
    ];
    const plan = autoAssignMonth(db(people), MONTH);
    const result = db(people, plan);
    for (const o of slotsOfMonth(MONTH)) {
      const seated = plan[o.key] ?? [];
      expect(seated.length).toBeLessThanOrEqual(SEATS_PER_SLOT);
      // No warnings means every filled slot respects the baró + status rules.
      if (seated.length === SEATS_PER_SLOT) {
        expect(slotWarnings(result, o)).toEqual([]);
      }
    }
  });
});
