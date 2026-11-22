import { findDuplicates, oddNames, planRename, applyPlan } from "./duplicates";

let id = 1;
const row = (event, year, places, game = "Quake Champions") => {
  const r = { id: id++, Event_Name: event, Year: year, Game: game, Mode: "Duel", Tier: 3, LAN: false };
  places.forEach((p, i) => (r[["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th"][i]] = p));
  return r;
};

// "busdriver" and "busdriverx" never meet and face the same crowd (strong).
// "raist" / "raisy" are one letter apart with almost no shared rivals (weak).
// "twin" / "twin_" finished in the same event, so they are two people.
const crowd = ["r1", "r2", "r3", "r4", "r5", "r6"];
const rows = [
  row("Cup 1", 2018, ["busdriver", ...crowd]),
  row("Cup 2", 2018, ["busdriverx", ...crowd]),
  row("Cup 3", 2019, ["busdriver", "r1"]),
  row("Old Cup", 2006, ["raist", "z1"], "Quake 3"),
  row("New Cup", 2020, ["raisy", "z2", "r1"], "Quake 3"),
  row("Same Cup", 2021, ["twin", "twin_"]),
  row("Typo Cup", 2021, ["WOLF", "Quake 3"]),
];

test("a pair that faces the same crowd is strong and listed first", () => {
  const pairs = findDuplicates(rows);
  expect(pairs[0]).toMatchObject({
    rule: "affix",
    strong: true,
    sharedRivals: 6,
    a: { name: "busdriver", events: 2 },
    b: { name: "busdriverx", events: 1 },
  });
  const weak = pairs.find((p) => p.a.name === "raist");
  expect(weak).toMatchObject({ rule: "lookalike", strong: false });
});

test("two names in the same event are never a pair", () => {
  expect(findDuplicates(rows).some((p) => p.a.name === "twin")).toBe(false);
});

test("odd names: capitals and a game name in a placement slot", () => {
  expect(oddNames(rows)).toEqual([
    { name: "WOLF", why: "capitals", rowIds: [7] },
    { name: "Quake 3", why: "capitals, a game or mode name", rowIds: [7] },
  ]);
});

test("a merge plan touches only the dropped name's slots, in lowercase", () => {
  const plan = planRename(rows, "busdriverx", "BusDriver ");
  expect(plan.to).toBe("busdriver");
  expect(plan.changes).toEqual([
    { id: 2, event: "Cup 2", year: 2018, game: "Quake Champions", mode: "Duel", slots: ["1st"], patch: { "1st": "busdriver" } },
  ]);
  expect(plan.conflicts).toEqual([]);
});

test("a rename into a name already in the row is a conflict, and nothing runs", async () => {
  const plan = planRename(rows, "twin_", "twin");
  expect(plan.changes).toEqual([]);
  expect(plan.conflicts.map((c) => c.id)).toEqual([6]);
  const calls = [];
  const res = await applyPlan(plan, async (i, p) => calls.push([i, p]));
  expect(calls).toEqual([]);
  expect(res.failed.message).toMatch(/already has/);
});

test("apply writes each row through the given writer, in id order", async () => {
  const plan = planRename(rows, "r1", "r-one");
  const calls = [];
  const res = await applyPlan(plan, async (i, p) => {
    calls.push([i, p]);
    return {};
  });
  expect(calls.map((c) => c[0])).toEqual([1, 2, 3, 5]);
  expect(calls[0][1]).toEqual({ "2nd": "r-one" });
  expect(res).toEqual({ done: [1, 2, 3, 5], failed: null });
});

test("apply stops at the first rejected write and reports it", async () => {
  const plan = planRename(rows, "r1", "r-one");
  const res = await applyPlan(plan, async (i) => (i === 2 ? { error: { message: "No row was updated" } } : {}));
  expect(res).toEqual({ done: [1], failed: { id: 2, message: "No row was updated" } });
});

test("an empty new name never writes", async () => {
  const calls = [];
  const res = await applyPlan(planRename(rows, "WOLF", "  "), async (i) => calls.push(i));
  expect(calls).toEqual([]);
  expect(res.failed.message).toMatch(/empty/);
});
