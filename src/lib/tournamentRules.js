// Shared tournament validation rules — the single source for what a valid
// Tournaments row is. Consumed by the admin form (webpack) AND by
// scripts/import-tournaments.js (plain node), hence CommonJS.
//
// KEEP THIS FILE FREE OF SYNTAX THAT NEEDS BABEL HELPERS (object spread,
// for-of, etc.): CRA's babel injects helper *imports* for those, which flips
// the file to ESM for webpack and kills module.exports ("module has no
// exports" build error). Object.assign + forEach are safe.

const GAMES = [
  "Quake World",
  "Quake 2",
  "Quake 3",
  "Quake 4",
  "Quake Live",
  "Quake Champions",
  "Diabotical",
];

const MODES = ["Duel", "2v2", "TDM", "CTF", "CA", "SAC", "WIP", "DBT"];

const PLACEMENTS = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th"];

const YEAR_MIN = 1996;
const TIER_MIN = 1;
const TIER_MAX = 5;

// Validates a typed row (numbers as numbers, LAN boolean, Prizepool number or
// null, placements string or null). Callers coerce first; passing raw values
// through on failed coercion keeps them visible in the error messages.
function validateRow(row) {
  const errs = [];
  const maxYear = new Date().getFullYear();
  if (!row.Event_Name) errs.push("missing Event_Name");
  if (!GAMES.includes(row.Game)) errs.push(`unknown Game "${row.Game}"`);
  if (!MODES.includes(row.Mode)) errs.push(`unknown Mode "${row.Mode}"`);
  if (!Number.isInteger(row.Tier) || row.Tier < TIER_MIN || row.Tier > TIER_MAX)
    errs.push(`Tier must be ${TIER_MIN}-${TIER_MAX}, got "${row.Tier}"`);
  if (!Number.isInteger(row.Year) || row.Year < YEAR_MIN || row.Year > maxYear)
    errs.push(`Year must be ${YEAR_MIN}-${maxYear}, got "${row.Year}"`);
  if (typeof row.LAN !== "boolean")
    errs.push(`LAN must be TRUE or FALSE, got "${row.LAN}"`);
  if (
    !(
      row.Prizepool === null ||
      (typeof row.Prizepool === "number" && !Number.isNaN(row.Prizepool))
    )
  )
    errs.push(`Prizepool not a number: "${row.Prizepool}"`);
  if (PLACEMENTS.every((p) => !row[p])) errs.push("no players in any placement");
  return errs;
}

// Trims Event_Name and placement names, lowercases placements ("" → null).
// Player names are stored lowercase in Supabase — PlayerPage equality queries
// depend on it.
function normalizeRow(row) {
  const out = Object.assign({}, row, {
    Event_Name: (row.Event_Name || "").trim(),
  });
  PLACEMENTS.forEach((p) => {
    const v = (row[p] || "").trim().toLowerCase();
    out[p] = v === "" ? null : v;
  });
  return out;
}

module.exports = {
  GAMES,
  MODES,
  PLACEMENTS,
  YEAR_MIN,
  TIER_MIN,
  TIER_MAX,
  validateRow,
  normalizeRow,
};
