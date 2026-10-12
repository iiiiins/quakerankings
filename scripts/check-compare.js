#!/usr/bin/env node
// Red-first check for src/lib/comparePlayers.js. Plain node, no deps:
//
//   node scripts/check-compare.js
//
// Exits 0 with GREEN when every case passes, 1 with RED otherwise. Run it
// with the module missing or broken and it goes red (the require throws, or
// a case mismatches); the module exists to turn it green.
//
// The fixture is hand-shaped like computeRankings output — the { players }
// result with player/Rank/points/placements/participations/ppe per entry.
// Drift between this shape and the real pipeline is covered by the jest
// suite (src/lib/comparePlayers.test.js), which runs the same module through
// the real computeRankings.

const comparePlayers = require("../src/lib/comparePlayers");

const rapha = {
  player: "rapha",
  Rank: 1,
  points: 3200,
  placements: { first: 12, second: 6, top4: 4, top8: 3 },
  participations: 25,
  ppe: 128,
  games: "Quake Live",
  modes: "Duel",
  tournaments: [],
};
const cooller = {
  player: "cooller",
  Rank: 2,
  points: 2100,
  placements: { first: 7, second: 9, top4: 5, top8: 9 },
  participations: 30,
  ppe: 70,
  games: "Quake 3",
  modes: "Duel",
  tournaments: [],
};
const toxjq = {
  player: "toxjq",
  Rank: 3,
  points: 900,
  placements: { first: 4, second: 1, top4: 0, top8: 0 },
  participations: 5,
  ppe: null,
  games: "Quake 4",
  modes: "Duel",
  tournaments: [],
};

const rankings = {
  players: [rapha, cooller, toxjq],
  filteredCount: 0,
  totalTournaments: 60,
};

const raphaSide = {
  name: "rapha",
  rank: 1,
  points: 3200,
  events: 25,
  firsts: 12,
  seconds: 6,
  top4: 4,
  top8: 3,
  ppe: 128,
};
const coollerSide = {
  name: "cooller",
  rank: 2,
  points: 2100,
  events: 30,
  firsts: 7,
  seconds: 9,
  top4: 5,
  top8: 9,
  ppe: 70,
};
const toxjqSide = {
  name: "toxjq",
  rank: 3,
  points: 900,
  events: 5,
  firsts: 4,
  seconds: 1,
  top4: 0,
  top8: 0,
  ppe: null,
};

let ran = 0;
let failed = 0;

// Deep compare via key-sorted JSON so property order never matters.
function stable(value) {
  return JSON.stringify(value, function (key, v) {
    if (v && typeof v === "object" && !Array.isArray(v)) {
      const sorted = {};
      Object.keys(v)
        .sort()
        .forEach(function (k) {
          sorted[k] = v[k];
        });
      return sorted;
    }
    return v;
  });
}

function check(label, actual, expected) {
  ran++;
  const a = stable(actual);
  const e = stable(expected);
  if (a === e) {
    console.log("  ok  " + label);
  } else {
    failed++;
    console.log("FAIL  " + label);
    console.log("      expected " + e);
    console.log("      got      " + a);
  }
}

check(
  "both found: full side-by-side numbers",
  comparePlayers(rankings, "rapha", "cooller"),
  { ok: true, left: raphaSide, right: coollerSide }
);

check(
  "left/right follow the argument order",
  comparePlayers(rankings, "cooller", "rapha"),
  { ok: true, left: coollerSide, right: raphaSide }
);

check(
  "name lookup ignores case and padding",
  comparePlayers(rankings, "  RAPHA  ", "Cooller"),
  { ok: true, left: raphaSide, right: coollerSide }
);

check(
  "a bare players array works the same as the result object",
  comparePlayers(rankings.players, "rapha", "toxjq"),
  { ok: true, left: raphaSide, right: toxjqSide }
);

check(
  "ppe below the min-events threshold stays null",
  comparePlayers(rankings, "toxjq", "rapha").left.ppe,
  null
);

check(
  "one unknown name: clear error, the missing name listed",
  comparePlayers(rankings, "rapha", "vo0"),
  { ok: false, error: "player not found: vo0", missing: ["vo0"] }
);

check(
  "both unknown: both names listed in asked order",
  comparePlayers(rankings, "zero4", "vo0"),
  { ok: false, error: "player not found: zero4, vo0", missing: ["zero4", "vo0"] }
);

check(
  "same player on both sides is allowed and equal",
  comparePlayers(rankings, "rapha", "rapha"),
  { ok: true, left: raphaSide, right: raphaSide }
);

console.log("");
if (failed) {
  console.log("RED  " + failed + " of " + ran + " checks failed");
  process.exit(1);
}
console.log("GREEN  all " + ran + " checks passed");
