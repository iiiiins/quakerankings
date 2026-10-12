// Pure side-by-side comparison of two ranked players — the logic half of the
// /compare page (src/components/ComparePage.js picks the two names and
// renders what this returns).
//
// Input is computeRankings output: the { players } result object, or the
// ranked players array itself. No React, no fetching, no DOM.
//
// CommonJS on purpose, same rule as tournamentRules.js: the plain-node check
// (scripts/check-compare.js) requires this file directly. KEEP THIS
// FILE FREE OF SYNTAX THAT NEEDS BABEL HELPERS (object spread, for-of):
// CRA's babel injects helper *imports* for those, which flips the file to
// ESM for webpack and kills module.exports.

function playersFrom(rankings) {
  if (Array.isArray(rankings)) return rankings;
  if (rankings && Array.isArray(rankings.players)) return rankings.players;
  return [];
}

// Player names are stored lowercase in Supabase; callers may pass display
// casing or padded input, so both sides normalize before matching.
function normalizeName(name) {
  return String(name == null ? "" : name).trim().toLowerCase();
}

function findPlayer(list, name) {
  const wanted = normalizeName(name);
  if (!wanted) return null;
  for (let i = 0; i < list.length; i++) {
    if (list[i] && normalizeName(list[i].player) === wanted) return list[i];
  }
  return null;
}

// One side of the comparison: the numbers the ranking already holds, flat.
// ppe stays null below the min-events threshold, same as the board.
function snapshot(player) {
  const placements = player.placements || {};
  return {
    name: player.player,
    rank: player.Rank,
    points: player.points,
    events: player.participations,
    firsts: placements.first || 0,
    seconds: placements.second || 0,
    top4: placements.top4 || 0,
    top8: placements.top8 || 0,
    ppe: typeof player.ppe === "number" ? player.ppe : null,
  };
}

// Compare two players by name against a computed ranking.
//   { ok: true, left, right }            — both found; left is the first name asked
//   { ok: false, error, missing: [...] } — any name absent from the ranking
// Asking for the same player on both sides is allowed and returns two equal sides.
function comparePlayers(rankings, nameA, nameB) {
  const list = playersFrom(rankings);
  const left = findPlayer(list, nameA);
  const right = findPlayer(list, nameB);

  const missing = [];
  if (!left) missing.push(String(nameA == null ? "" : nameA).trim() || "(empty name)");
  if (!right) missing.push(String(nameB == null ? "" : nameB).trim() || "(empty name)");
  if (missing.length) {
    return {
      ok: false,
      error: "player not found: " + missing.join(", "),
      missing: missing,
    };
  }

  return { ok: true, left: snapshot(left), right: snapshot(right) };
}

module.exports = comparePlayers;
