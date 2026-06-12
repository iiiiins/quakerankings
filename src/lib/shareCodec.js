// Share-link codec — the v1 public URL contract: #/?f=v1[.<segment>]*
//
// Once links circulate this format is permanent: the v1 grammar never
// changes, only the code vocabulary may grow (new games/modes). Decoding is
// lenient — unknown segments and unknown codes are skipped, malformed
// segments fall back to defaults — so any v1 link always produces a board.
// Segments are omitted when at default, and an omitted segment means
// DEFAULT (never "the viewer's stored formula") so the same link shows the
// same board to everyone. Defaults live in lib/formulaDefaults.js; changing
// a default there changes what existing links decode to.
//
// Schema (canonical segment order; "-" separates list items, "_" binds a
// weight to its code):
//   p<n>-<n>-<n>-<n>          base points first-second-top4-top8
//   hp<c>[-<c>]               hidden placements   c ∈ 1|2|4|8
//   t<n>-<n>-<n>-<n>-<n>      tier weights 1→5
//   ht<c>[-<c>]               hidden tiers        c ∈ 1..5
//   g<code>_<n>[-<code>_<n>]  game weights ≠ 100
//   hg<code>[-<code>]         hidden games
//   m<code>_<n>[-<code>_<n>]  mode weights ≠ 100
//   hm<code>[-<code>]         hidden modes
//   e<n>                      min events for Pts/Event ≠ 15
//   fg<code>                  game filter ≠ All
//   fm<code>                  mode filter ≠ All
//   y<from>-<to>              year range ≠ 1996–current
//   l                         LAN only
//   w                         Power Ranking
// Game codes: qw q2 q3 q4 ql qc db · mode codes: duel 2v2 tdm ctf ca sac wip dbt

import {
  CURRENT_YEAR,
  YEAR_MIN,
  GAMES,
  MODES,
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

const PLACEMENTS = ["first", "second", "top4", "top8"];
const PLACEMENT_CODES = { first: "1", second: "2", top4: "4", top8: "8" };
const PLACEMENT_LABELS = { first: "1st", second: "2nd", top4: "Top4", top8: "Top8" };
const TIERS = ["1", "2", "3", "4", "5"];

const GAME_CODES = {
  "Quake World": "qw",
  "Quake 2": "q2",
  "Quake 3": "q3",
  "Quake 4": "q4",
  "Quake Live": "ql",
  "Quake Champions": "qc",
  Diabotical: "db",
};

const MODE_CODES = {
  Duel: "duel",
  "2v2": "2v2",
  TDM: "tdm",
  CTF: "ctf",
  CA: "ca",
  SAC: "sac",
  WIP: "wip",
  DBT: "dbt",
};

const invert = (map) =>
  Object.fromEntries(Object.entries(map).map(([k, v]) => [v, k]));
const CODE_TO_GAME = invert(GAME_CODES);
const CODE_TO_MODE = invert(MODE_CODES);
const CODE_TO_PLACEMENT = invert(PLACEMENT_CODES);

// Weights and points are sanitized to non-negative integers on both ends so
// a round-trip is exact and a hand-edited link can't inject NaN into scoring.
const num = (x) => {
  const n = Math.round(Number(x));
  if (!Number.isFinite(n)) return 0;
  return Math.min(Math.max(n, 0), 100000);
};

const clampYear = (n) => Math.min(Math.max(n, YEAR_MIN), CURRENT_YEAR);

// ---------------------------------------------------------------- encoding

export function encodeShareState(config, filters) {
  const segs = [];

  if (PLACEMENTS.some((k) => num(config.pointsConfig[k]) !== DEFAULT_POINTS_CONFIG[k])) {
    segs.push("p" + PLACEMENTS.map((k) => num(config.pointsConfig[k])).join("-"));
  }

  const hp = PLACEMENTS.filter((k) => !config.pointsVisibility[k]);
  if (hp.length) segs.push("hp" + hp.map((k) => PLACEMENT_CODES[k]).join("-"));

  if (TIERS.some((t) => num(config.tierWeights[t]) !== DEFAULT_TIER_WEIGHTS[t])) {
    segs.push("t" + TIERS.map((t) => num(config.tierWeights[t])).join("-"));
  }

  const ht = TIERS.filter((t) => !config.tierVisibility[t]);
  if (ht.length) segs.push("ht" + ht.join("-"));

  const g = GAMES.filter((game) => num(config.gameWeights[game]) !== 100);
  if (g.length) {
    segs.push("g" + g.map((game) => `${GAME_CODES[game]}_${num(config.gameWeights[game])}`).join("-"));
  }

  const hg = GAMES.filter((game) => !config.gameVisibility[game]);
  if (hg.length) segs.push("hg" + hg.map((game) => GAME_CODES[game]).join("-"));

  const m = MODES.filter((mode) => num(config.modeWeights[mode]) !== 100);
  if (m.length) {
    segs.push("m" + m.map((mode) => `${MODE_CODES[mode]}_${num(config.modeWeights[mode])}`).join("-"));
  }

  const hm = MODES.filter((mode) => !config.modeVisibility[mode]);
  if (hm.length) segs.push("hm" + hm.map((mode) => MODE_CODES[mode]).join("-"));

  if (num(config.minEventsForPpe) !== DEFAULT_MIN_EVENTS_FOR_PPE) {
    segs.push("e" + num(config.minEventsForPpe));
  }

  if (filters.selectedGame !== "All" && GAME_CODES[filters.selectedGame]) {
    segs.push("fg" + GAME_CODES[filters.selectedGame]);
  }

  if (filters.selectedMode !== "All" && MODE_CODES[filters.selectedMode]) {
    segs.push("fm" + MODE_CODES[filters.selectedMode]);
  }

  const [from, to] = filters.yearRange;
  if (from !== YEAR_MIN || to !== CURRENT_YEAR) segs.push(`y${from}-${to}`);

  if (filters.lanOnly) segs.push("l");
  if (filters.powerRanking) segs.push("w");

  return ["v1", ...segs].join(".");
}

// ---------------------------------------------------------------- decoding

// Returns a COMPLETE { config, filters } (defaults + link overrides), or
// null when the string isn't a v1 share param at all.
export function decodeShareParam(raw) {
  if (typeof raw !== "string") return null;
  const parts = raw.split(".");
  if (parts[0] !== "v1") return null;

  const config = {
    pointsConfig: { ...DEFAULT_POINTS_CONFIG },
    pointsVisibility: { ...DEFAULT_POINTS_VISIBILITY },
    gameWeights: { ...DEFAULT_GAME_WEIGHTS },
    gameVisibility: { ...DEFAULT_GAME_VISIBILITY },
    tierWeights: { ...DEFAULT_TIER_WEIGHTS },
    tierVisibility: { ...DEFAULT_TIER_VISIBILITY },
    modeWeights: { ...DEFAULT_MODE_WEIGHTS },
    modeVisibility: { ...DEFAULT_MODE_VISIBILITY },
    minEventsForPpe: DEFAULT_MIN_EVENTS_FOR_PPE,
  };
  const filters = {
    ...DEFAULT_FILTERS,
    yearRange: [...DEFAULT_FILTERS.yearRange],
  };

  const ints = (s, sep) => {
    const out = s.split(sep).map((v) => Math.round(Number(v)));
    return out.every(Number.isFinite) ? out : null;
  };

  for (const seg of parts.slice(1)) {
    if (!seg) continue;

    if (seg === "l") {
      filters.lanOnly = true;
    } else if (seg === "w") {
      filters.powerRanking = true;
    } else if (seg.startsWith("hp")) {
      seg.slice(2).split("-").forEach((c) => {
        const key = CODE_TO_PLACEMENT[c];
        if (key) config.pointsVisibility[key] = false;
      });
    } else if (seg.startsWith("ht")) {
      seg.slice(2).split("-").forEach((c) => {
        if (TIERS.includes(c)) config.tierVisibility[c] = false;
      });
    } else if (seg.startsWith("hg")) {
      seg.slice(2).split("-").forEach((c) => {
        const game = CODE_TO_GAME[c];
        if (game) config.gameVisibility[game] = false;
      });
    } else if (seg.startsWith("hm")) {
      seg.slice(2).split("-").forEach((c) => {
        const mode = CODE_TO_MODE[c];
        if (mode) config.modeVisibility[mode] = false;
      });
    } else if (seg.startsWith("fg")) {
      const game = CODE_TO_GAME[seg.slice(2)];
      if (game) filters.selectedGame = game;
    } else if (seg.startsWith("fm")) {
      const mode = CODE_TO_MODE[seg.slice(2)];
      if (mode) filters.selectedMode = mode;
    } else if (seg.startsWith("p")) {
      const vals = ints(seg.slice(1), "-");
      if (vals && vals.length === PLACEMENTS.length) {
        PLACEMENTS.forEach((k, i) => {
          config.pointsConfig[k] = num(vals[i]);
        });
      }
    } else if (seg.startsWith("t")) {
      const vals = ints(seg.slice(1), "-");
      if (vals && vals.length === TIERS.length) {
        TIERS.forEach((t, i) => {
          config.tierWeights[t] = num(vals[i]);
        });
      }
    } else if (seg.startsWith("g")) {
      seg.slice(1).split("-").forEach((pair) => {
        const [code, w] = pair.split("_");
        const game = CODE_TO_GAME[code];
        if (game && w !== undefined && Number.isFinite(Number(w))) {
          config.gameWeights[game] = num(w);
        }
      });
    } else if (seg.startsWith("m")) {
      seg.slice(1).split("-").forEach((pair) => {
        const [code, w] = pair.split("_");
        const mode = CODE_TO_MODE[code];
        if (mode && w !== undefined && Number.isFinite(Number(w))) {
          config.modeWeights[mode] = num(w);
        }
      });
    } else if (seg.startsWith("e")) {
      const n = Number(seg.slice(1));
      if (Number.isFinite(n)) config.minEventsForPpe = num(n);
    } else if (seg.startsWith("y")) {
      const vals = ints(seg.slice(1), "-");
      if (vals && vals.length === 2) {
        let [from, to] = vals.map(clampYear);
        if (from > to) [from, to] = [to, from];
        filters.yearRange = [from, to];
      }
    }
    // anything else: unknown segment — skip (forward compatibility)
  }

  return { config, filters };
}

// Extracts and decodes the f param from a location hash like
// "#/?f=v1.y2003-2013.l". HashRouter keeps the query inside the fragment, so
// this reads window.location.hash — never location.search.
export function parseShareFromHash(hash) {
  const q = (hash || "").indexOf("?");
  if (q === -1) return null;
  const raw = new URLSearchParams(hash.slice(q + 1)).get("f");
  return raw ? decodeShareParam(raw) : null;
}

// --------------------------------------------------------------- summaries

// Human chips describing every non-default piece of the state, used by the
// share popover, the shared-view banner, and the share-card footer.
export function summarizeShareState(config, filters) {
  const chips = [];

  const [from, to] = filters.yearRange;
  if (from !== YEAR_MIN || to !== CURRENT_YEAR) chips.push(`Years ${from}–${to}`);
  if (filters.lanOnly) chips.push("LAN only");
  if (filters.selectedGame !== "All") chips.push(`${filters.selectedGame} only`);
  if (filters.selectedMode !== "All") chips.push(`${filters.selectedMode} only`);
  if (filters.powerRanking) chips.push("Power Ranking");

  if (PLACEMENTS.some((k) => num(config.pointsConfig[k]) !== DEFAULT_POINTS_CONFIG[k])) {
    chips.push("Points " + PLACEMENTS.map((k) => num(config.pointsConfig[k])).join("/"));
  }

  const visiblePlacements = PLACEMENTS.filter((k) => config.pointsVisibility[k]);
  if (visiblePlacements.length < PLACEMENTS.length) {
    chips.push(
      visiblePlacements.length
        ? "Only " + visiblePlacements.map((k) => PLACEMENT_LABELS[k]).join("+")
        : "No placements"
    );
  }

  if (TIERS.some((t) => num(config.tierWeights[t]) !== DEFAULT_TIER_WEIGHTS[t])) {
    chips.push("Tier weights " + TIERS.map((t) => num(config.tierWeights[t])).join("/"));
  }

  const visibleTiers = TIERS.filter((t) => config.tierVisibility[t]);
  if (visibleTiers.length < TIERS.length) {
    chips.push(visibleTiers.length ? "Tiers " + listRuns(visibleTiers) : "No tiers");
  }

  GAMES.filter((game) => num(config.gameWeights[game]) !== 100).forEach((game) => {
    chips.push(`${game} ${num(config.gameWeights[game])}%`);
  });

  const hiddenGames = GAMES.filter((game) => !config.gameVisibility[game]);
  if (hiddenGames.length) chips.push("Without " + hiddenGames.join(", "));

  MODES.filter((mode) => num(config.modeWeights[mode]) !== 100).forEach((mode) => {
    chips.push(`${mode} ${num(config.modeWeights[mode])}%`);
  });

  const hiddenModes = MODES.filter((mode) => !config.modeVisibility[mode]);
  if (hiddenModes.length) chips.push("Without " + hiddenModes.join(", "));

  if (num(config.minEventsForPpe) !== DEFAULT_MIN_EVENTS_FOR_PPE) {
    chips.push(`PPE min ${num(config.minEventsForPpe)}`);
  }

  return chips.length ? chips : ["Default formula"];
}

// "1,2,3,5" → "1–3, 5" — tier lists read as ranges where contiguous
function listRuns(values) {
  const nums = values.map(Number);
  const runs = [];
  let start = nums[0];
  let prev = nums[0];
  for (const n of nums.slice(1)) {
    if (n === prev + 1) {
      prev = n;
      continue;
    }
    runs.push(start === prev ? `${start}` : `${start}–${prev}`);
    start = prev = n;
  }
  runs.push(start === prev ? `${start}` : `${start}–${prev}`);
  return runs.join(", ");
}
