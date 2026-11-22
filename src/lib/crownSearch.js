// Crown search over every knob a v1 share link carries.
//
// Question: for a player X, what is the SIMPLEST board setup that puts X at
// #1? "Setup" = the home filters (game, mode, year range, LAN only, Power
// Ranking) plus the formula (placement points, tier / game / mode weights;
// a weight of 0 does what a visibility toggle does, so toggles add nothing).
// "Simplest" = fewest non-default share-link segments, then the widest years.
//
// Two facts keep the search small:
//  - Filters only ever REMOVE results. Narrowing the years to start and end
//    on years X actually played, or picking a game / mode X played, can only
//    remove rivals' points, never X's. So only those values are tried.
//  - With filters fixed and only ONE weight family changed, every player's
//    total is linear in that family's weights, so the crown is a vertex
//    question; tryWeights samples one-hot, paired and random mixes.
// Mixing two weight families at once is NOT searched. Every answer is
// re-checked with the real computeRankings through its own share link
// (see verifyCrown), so a hit is real; a miss only means "not in the space
// this file searches", and the UI words it that way.

import {
  GAMES,
  MODES,
  CURRENT_YEAR,
  YEAR_MIN,
  DEFAULT_POINTS_CONFIG,
  DEFAULT_POINTS_VISIBILITY,
  DEFAULT_GAME_WEIGHTS,
  DEFAULT_GAME_VISIBILITY,
  DEFAULT_TIER_WEIGHTS,
  DEFAULT_TIER_VISIBILITY,
  DEFAULT_MODE_WEIGHTS,
  DEFAULT_MODE_VISIBILITY,
  DEFAULT_MIN_EVENTS_FOR_PPE,
  DEFAULT_FILTERS,
} from "./formulaDefaults";
import computeRankings from "./computeRankings";
import { encodeShareState, decodeShareParam } from "./shareCodec";

const SLOTS = [
  ["1st", 0], ["2nd", 1], ["3rd", 2], ["4th", 2],
  ["5th", 3], ["6th", 3], ["7th", 3], ["8th", 3],
];
const PLACE_KEYS = ["first", "second", "top4", "top8"];
const TIER_KEYS = ["1", "2", "3", "4", "5"];
const POWER_LIMIT = 25; // computeRankings' POWER_RANKING_LIMIT

// weight families: [name, size, offset into a player's 24-number vector]
export const FAMILIES = [
  ["points", 4, 0],
  ["tiers", 5, 4],
  ["games", GAMES.length, 9],
  ["modes", MODES.length, 9 + GAMES.length],
];
const VEC = 9 + GAMES.length + MODES.length;

export const idOf = (prep, name) =>
  prep.ids.get(String(name || "")) ?? prep.lower.get(String(name || "").toLowerCase());

// rows -> compact form, one entry per scorable row
export function prepare(rows) {
  const names = [];
  const ids = new Map();
  const lower = new Map(); // lowercase -> first id with that spelling
  // exact names, like computeRankings (it does not lowercase; 3 stored
  // names have capitals). Lookups fall back to lowercase, see idOf.
  const pid = (n) => {
    const k = String(n);
    if (!ids.has(k)) {
      ids.set(k, names.length);
      if (!lower.has(k.toLowerCase())) lower.set(k.toLowerCase(), names.length);
      names.push(k);
    }
    return ids.get(k);
  };
  const R = [];
  (rows || []).forEach((r) => {
    if (!r.Game || !r.Mode || !r.Tier || !r.Year) return;
    const g = GAMES.indexOf(r.Game);
    const m = MODES.indexOf(r.Mode);
    const t = TIER_KEYS.indexOf(String(r.Tier));
    const places = [];
    SLOTS.forEach(([slot, b]) => {
      if (r[slot]) places.push([pid(r[slot]), b]);
    });
    R.push({ g, m, t, y: r.Year, lan: Boolean(r.LAN), places });
  });
  return { names, ids, lower, rows: R };
}

const baseOf = (b) => DEFAULT_POINTS_CONFIG[PLACE_KEYS[b]];
const tierOf = (t) => (DEFAULT_TIER_WEIGHTS[TIER_KEYS[t]] ?? 100) / 100;

// A cell = filter setup. -> Map(playerId -> Float64Array(24)), laid out so
// that a family's new weights w give the real points as dot(v, w) * SCALE:
//   points[0..3] = tier-weighted count of each placement (x p-values, scale 1)
//   tiers[4..8]  = default placement points earned in each tier (x weight/100)
//   games, modes = default points earned in each (x weight/100)
// The games part sums to the default total.
function cellVectors(prep, f) {
  const vec = new Map();
  prep.rows.forEach((r) => {
    if (f.g >= 0 && r.g !== f.g) return;
    if (f.m >= 0 && r.m !== f.m) return;
    if (r.y < f.from || r.y > f.to) return;
    if (f.lan && !r.lan) return;
    r.places.forEach(([p, b]) => {
      const pts = baseOf(b) * tierOf(r.t);
      if (!vec.has(p)) vec.set(p, new Float64Array(VEC));
      const v = vec.get(p);
      v[b] += tierOf(r.t);
      if (r.t >= 0) v[4 + r.t] += baseOf(b);
      if (r.g >= 0) v[9 + r.g] += pts;
      if (r.m >= 0) v[9 + GAMES.length + r.m] += pts;
    });
  });
  return vec;
}

// default-weight totals under Power Ranking: each player's best 25 results
function powerTotals(prep, f) {
  const lists = new Map();
  prep.rows.forEach((r) => {
    if (f.g >= 0 && r.g !== f.g) return;
    if (f.m >= 0 && r.m !== f.m) return;
    if (r.y < f.from || r.y > f.to) return;
    if (f.lan && !r.lan) return;
    r.places.forEach(([p, b]) => {
      if (!lists.has(p)) lists.set(p, []);
      lists.get(p).push(baseOf(b) * tierOf(r.t));
    });
  });
  const tot = new Map();
  lists.forEach((l, p) => {
    l.sort((a, b) => b - a);
    tot.set(p, l.slice(0, POWER_LIMIT).reduce((a, b) => a + b, 0));
  });
  return tot;
}

// #1 the way the board shows it: computeRankings rounds points to whole
// numbers, so a 52.4 vs 52.0 lead is a tie on screen. A lead of at least one
// full point always survives rounding (and float drift in the sums).
const LEAD = 1.000001;
const wins = (scores, me) => {
  const mine = scores.get(me) || 0;
  if (mine < LEAD) return false;
  for (const [p, s] of scores) if (p !== me && mine - s < LEAD) return false;
  return true;
};
const SCALE = { points: 1, tiers: 0.01, games: 0.01, modes: 0.01 };

const dot = (v, off, w) => {
  let s = 0;
  for (let i = 0; i < w.length; i++) s += v[off + i] * w[i];
  return s;
};

// weight mixes to try for a family of size n: one-hots, pairs at a few
// ratios, then seeded random sparse and dense mixes
function mixes(n, extra = 60) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const w = new Array(n).fill(0);
    w[i] = 100;
    out.push(w);
  }
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      [[100, 25], [100, 50], [100, 100], [50, 100], [25, 100]].forEach(([a, b]) => {
        const w = new Array(n).fill(0);
        w[i] = a;
        w[j] = b;
        out.push(w);
      });
    }
  }
  let seed = 1996 + n;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  for (let k = 0; k < extra; k++) {
    const w = new Array(n).fill(0);
    if (k % 2) for (let i = 0; i < n; i++) w[i] = Math.round(rand() * 100);
    else for (let j = 0; j < 3; j++) w[Math.floor(rand() * n)] = 5 + Math.round(rand() * 95);
    if (w.some((x) => x > 0)) out.push(w);
  }
  return out;
}
const MIX_CACHE = new Map();
const mixesFor = (n) => {
  if (!MIX_CACHE.has(n)) MIX_CACHE.set(n, mixes(n));
  return MIX_CACHE.get(n);
};

const nonZero = (w) => w.filter((x) => x > 0).length;

// a player's real points when one family's weights are w (filters fixed)
const famScore = (v, fam, w) => dot(v, fam[2], w) * SCALE[fam[0]];

// one weight family, filters fixed: the simplest mix that crowns `me`, or null
// strict: no weight may be 0 (nothing switched off), so zeros become 1
function tryWeights(vec, me, fam, strict = false) {
  const n = fam[1];
  const mine = vec.get(me);
  if (!mine) return null;
  let best = null;
  for (const raw of mixesFor(n)) {
    const w = strict ? raw.map((x) => Math.max(1, x)) : raw;
    if (best && nonZero(raw) >= nonZero(best.raw)) continue;
    const mineScore = famScore(mine, fam, w);
    if (mineScore < LEAD) continue;
    let ok = true;
    for (const [p, v] of vec) {
      if (p === me) continue;
      if (mineScore - famScore(v, fam, w) < LEAD) {
        ok = false;
        break;
      }
    }
    if (ok) best = { w, raw };
  }
  return best && best.w;
}

const defaultTotals = (vec) => {
  const t = new Map();
  vec.forEach((v, p) => {
    let s = 0;
    for (let i = 0; i < GAMES.length; i++) s += v[9 + i];
    t.set(p, s);
  });
  return t;
};

// every filter setup worth trying for player `me`, cheapest first
function cellsFor(prep, me, { boardOnly = false, strict = false } = {}) {
  const games = new Set();
  const modes = new Set();
  const years = new Set();
  let hasLan = false;
  prep.rows.forEach((r) => {
    if (!r.places.some(([p]) => p === me)) return;
    games.add(r.g);
    modes.add(r.m);
    years.add(r.y);
    hasLan = hasLan || r.lan;
  });
  const ys = [...years].sort((a, b) => a - b);
  const spans = [[YEAR_MIN, CURRENT_YEAR]];
  if (!strict) ys.forEach((a, i) => ys.slice(i).forEach((b) => spans.push([a, b])));
  const gs = boardOnly || strict ? [-1] : [-1, ...[...games].sort((a, b) => a - b)];
  const ms = boardOnly || strict ? [-1] : [-1, ...[...modes].sort((a, b) => a - b)];
  const cells = [];
  gs.forEach((g) =>
    ms.forEach((m) =>
      spans.forEach(([from, to], si) =>
        [false, ...(hasLan && !strict ? [true] : [])].forEach((lan) =>
          [false, true].forEach((power) => {
            const cost = (g >= 0) + (m >= 0) + (si > 0) + lan + power;
            cells.push({ g, m, from, to, lan, power, cost, width: to - from });
          })
        )
      )
    )
  );
  // cheapest first; at equal cost the widest year span first
  cells.sort((x, y) => x.cost - y.cost || y.width - x.width);
  return cells;
}

// -> { setup, searched } where setup is null when nothing in the space crowns
// them. setup = { filter: {g,m,from,to,lan,power}, family: name|null, weights }
export function findCrown(prep, name, opts = {}) {
  const me = idOf(prep, name);
  const searched = { cells: 0, mixes: 0, families: FAMILIES.map((f) => f[0]), strict: !!opts.strict };
  if (me == null) return { setup: null, searched };
  const cells = cellsFor(prep, me, opts);
  let best = null;
  for (const cell of cells) {
    // a weighted answer costs one more segment than its cell, plus a half so
    // that at equal length a filter ("Wipeout only") beats seven zero weights
    if (best && cell.cost >= best.cost) break;
    searched.cells++;
    if (cell.power) {
      if (wins(powerTotals(prep, cell), me)) best = { filter: cell, family: null, weights: null, cost: cell.cost };
      continue;
    }
    const vec = cellVectors(prep, cell);
    if (!vec.has(me)) continue;
    if (wins(defaultTotals(vec), me)) {
      best = { filter: cell, family: null, weights: null, cost: cell.cost };
      continue;
    }
    if (best && cell.cost + 1.5 >= best.cost) continue;
    for (const fam of FAMILIES) {
      searched.mixes += mixesFor(fam[1]).length;
      const w = tryWeights(vec, me, fam, opts.strict);
      if (w) {
        best = { filter: cell, family: fam[0], weights: w, cost: cell.cost + 1.5 };
        break;
      }
    }
  }
  return { setup: best, searched };
}

// setup -> the { config, filters } pair a share link encodes
export function setupToState(setup) {
  const f = setup.filter;
  const config = {
    pointsConfig: { ...DEFAULT_POINTS_CONFIG },
    pointsVisibility: { ...DEFAULT_POINTS_VISIBILITY },
    tierWeights: { ...DEFAULT_TIER_WEIGHTS },
    tierVisibility: { ...DEFAULT_TIER_VISIBILITY },
    gameWeights: { ...DEFAULT_GAME_WEIGHTS },
    gameVisibility: { ...DEFAULT_GAME_VISIBILITY },
    modeWeights: { ...DEFAULT_MODE_WEIGHTS },
    modeVisibility: { ...DEFAULT_MODE_VISIBILITY },
    minEventsForPpe: DEFAULT_MIN_EVENTS_FOR_PPE,
  };
  const w = setup.weights;
  if (setup.family === "points") PLACE_KEYS.forEach((k, i) => (config.pointsConfig[k] = w[i]));
  if (setup.family === "tiers") TIER_KEYS.forEach((k, i) => (config.tierWeights[k] = w[i]));
  if (setup.family === "games") GAMES.forEach((g, i) => (config.gameWeights[g] = w[i]));
  if (setup.family === "modes") MODES.forEach((m, i) => (config.modeWeights[m] = w[i]));
  const filters = {
    ...DEFAULT_FILTERS,
    selectedGame: f.g >= 0 ? GAMES[f.g] : "All",
    selectedMode: f.m >= 0 ? MODES[f.m] : "All",
    yearRange: [f.from, f.to],
    lanOnly: f.lan,
    powerRanking: f.power,
  };
  return { config, filters };
}

// the share param ("v1....") for a setup
export const shareParam = (setup) => {
  const { config, filters } = setupToState(setup);
  return encodeShareState(config, filters);
};

// End-to-end check: decode the setup's own share link the way a visitor's
// browser does, rank with the real computeRankings, and read who is #1.
// -> { ok, top, param }
export function verifyCrown(rows, name, setup) {
  const param = shareParam(setup);
  const decoded = decodeShareParam(param);
  const { players } = computeRankings(rows, { ...decoded.config, ...decoded.filters });
  const top = players[0];
  const second = players[1];
  const me = String(name).toLowerCase();
  const ok = Boolean(top && top.player.toLowerCase() === me && (!second || second.points < top.points));
  return { ok, top: top?.player, param };
}

// The search's own idea of every player's points under a setup without
// Power Ranking: name -> points. Tests hold this equal to computeRankings.
export function scoresFor(prep, setup) {
  const vec = cellVectors(prep, setup.filter);
  const fam = FAMILIES.find((f) => f[0] === setup.family);
  const out = new Map();
  vec.forEach((v, p) => {
    out.set(prep.names[p], fam ? famScore(v, fam, setup.weights) : defaultTotals(new Map([[p, v]])).get(p));
  });
  return out;
}
