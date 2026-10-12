// Pins comparePlayers through the REAL scoring pipeline: rows go into
// computeRankings, its output goes into comparePlayers. If the ranked-player
// shape ever changes, this suite goes red where the plain-node check's
// hand-shaped fixture (scripts/check-compare.js) could drift silently.
import computeRankings from "./computeRankings";
import comparePlayers from "./comparePlayers";

const CONFIG = {
  selectedGame: "All",
  selectedMode: "All",
  yearRange: [1996, 2030],
  lanOnly: false,
  powerRanking: false,
  pointsConfig: { first: 100, second: 50, top4: 25, top8: 10 },
  pointsVisibility: { first: true, second: true, top4: true, top8: true },
  gameWeights: {},
  gameVisibility: {},
  tierWeights: { 1: 100, 2: 60, 3: 35, 4: 20, 5: 10 },
  tierVisibility: {},
  modeWeights: {},
  modeVisibility: {},
  minEventsForPpe: 15,
};

function row(overrides) {
  return {
    id: 1,
    Event_Name: "Event",
    Game: "Quake 3",
    Mode: "Duel",
    Tier: 1,
    Year: 2003,
    LAN: true,
    Prizepool: null,
    "1st": null,
    "2nd": null,
    "3rd": null,
    "4th": null,
    "5th": null,
    "6th": null,
    "7th": null,
    "8th": null,
    ...overrides,
  };
}

// alpha: two tier-1 wins = 200 points, rank 1.
// bravo: one win + one second = 150 points, rank 2.
const ROWS = [
  row({ id: 1, Event_Name: "A", "1st": "alpha", "2nd": "bravo" }),
  row({ id: 2, Event_Name: "B", "1st": "alpha" }),
  row({ id: 3, Event_Name: "C", "1st": "bravo" }),
];

test("side-by-side numbers come from the real pipeline", () => {
  const result = comparePlayers(computeRankings(ROWS, CONFIG), "alpha", "bravo");
  expect(result.ok).toBe(true);
  expect(result.left).toEqual({
    name: "alpha",
    rank: 1,
    points: 200,
    events: 2,
    firsts: 2,
    seconds: 0,
    top4: 0,
    top8: 0,
    ppe: null,
  });
  expect(result.right).toEqual({
    name: "bravo",
    rank: 2,
    points: 150,
    events: 2,
    firsts: 1,
    seconds: 1,
    top4: 0,
    top8: 0,
    ppe: null,
  });
});

test("the bare players array is accepted too", () => {
  const ranked = computeRankings(ROWS, CONFIG).players;
  const result = comparePlayers(ranked, "bravo", "alpha");
  expect(result.ok).toBe(true);
  expect(result.left.name).toBe("bravo");
  expect(result.right.name).toBe("alpha");
});

test("lookup ignores case and padding, matching the lowercase name store", () => {
  const result = comparePlayers(computeRankings(ROWS, CONFIG), " ALPHA ", "Bravo");
  expect(result.ok).toBe(true);
  expect(result.left.name).toBe("alpha");
  expect(result.right.name).toBe("bravo");
});

test("a missing player returns the clear error value", () => {
  const result = comparePlayers(computeRankings(ROWS, CONFIG), "alpha", "nosuch");
  expect(result).toEqual({
    ok: false,
    error: "player not found: nosuch",
    missing: ["nosuch"],
  });
});

test("both missing lists both names", () => {
  const result = comparePlayers(computeRankings(ROWS, CONFIG), "ghost1", "ghost2");
  expect(result.ok).toBe(false);
  expect(result.missing).toEqual(["ghost1", "ghost2"]);
});

test("ppe crosses the threshold through the real pipeline", () => {
  const rows = [];
  for (let i = 0; i < 15; i++) {
    rows.push(row({ id: i + 1, Event_Name: "E" + i, "1st": "grinder" }));
  }
  rows.push(row({ id: 99, Event_Name: "One", "1st": "tourist" }));
  const result = comparePlayers(computeRankings(rows, CONFIG), "grinder", "tourist");
  expect(result.ok).toBe(true);
  expect(result.left.ppe).toBe(100); // 1500 points over 15 events
  expect(result.right.ppe).toBeNull();
});
