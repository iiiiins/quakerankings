// Single source of truth for the default scoring formula and home-board
// filters. The share-link codec (lib/shareCodec.js) omits anything equal to
// these defaults, so a changed default silently changes what existing share
// links decode to — treat edits here as part of the v1 share contract.

export const CURRENT_YEAR = new Date().getFullYear();
export const YEAR_MIN = 1996;

export const GAMES = [
  "Quake World",
  "Quake 2",
  "Quake 3",
  "Quake 4",
  "Quake Live",
  "Quake Champions",
  "Diabotical",
];

export const MODES = ["Duel", "2v2", "TDM", "CTF", "CA", "SAC", "WIP", "DBT"];

export const DEFAULT_POINTS_CONFIG = {
  first: 100,
  second: 50,
  top4: 25,
  top8: 10,
};

export const DEFAULT_POINTS_VISIBILITY = {
  first: true,
  second: true,
  top4: true,
  top8: true,
};

export const DEFAULT_GAME_WEIGHTS = {
  "Quake World": 100,
  "Quake 2": 100,
  "Quake 3": 100,
  "Quake 4": 100,
  "Quake Live": 100,
  "Quake Champions": 100,
  Diabotical: 100,
};

export const DEFAULT_GAME_VISIBILITY = {
  "Quake World": true,
  "Quake 2": true,
  "Quake 3": true,
  "Quake 4": true,
  "Quake Live": true,
  "Quake Champions": true,
  Diabotical: true,
};

export const DEFAULT_TIER_WEIGHTS = {
  1: 100,
  2: 60,
  3: 35,
  4: 20,
  5: 10,
};

export const DEFAULT_TIER_VISIBILITY = {
  1: true,
  2: true,
  3: true,
  4: true,
  5: true,
};

export const DEFAULT_MODE_WEIGHTS = {
  Duel: 100,
  "2v2": 100,
  TDM: 100,
  CTF: 100,
  CA: 100,
  SAC: 100,
  WIP: 100,
  DBT: 100,
};

export const DEFAULT_MODE_VISIBILITY = {
  Duel: true,
  "2v2": true,
  TDM: true,
  CTF: true,
  CA: true,
  SAC: true,
  WIP: true,
  DBT: true,
};

export const DEFAULT_MIN_EVENTS_FOR_PPE = 15;

// Home-board filter defaults (per-page state owned by PlayerList). sortBy /
// sortOrder ride along because the share contract carries the board's
// ranking sort (Pts/Event) even though they aren't filters strictly.
export const DEFAULT_FILTERS = {
  selectedGame: "All",
  selectedMode: "All",
  yearRange: [YEAR_MIN, CURRENT_YEAR],
  lanOnly: false,
  powerRanking: false,
  sortBy: "Points",
  sortOrder: "desc",
};
