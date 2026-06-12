// Column sort + PPE formatting shared by the leaderboard and the share
// surfaces (popover card). Lives outside PlayerList so the card can apply
// exactly the sort a share link encodes — same-pipeline principle as
// computeRankings. Moved verbatim from PlayerList.js (feature-4 follow-up).

const columnKeyMap = {
  "1st": "placements.first",
  "2nd": "placements.second",
  Top4: "placements.top4",
  Top8: "placements.top8",
  Ppe: "ppe",
  Points: "points",
  Player: "player",
  Rank: "Rank",
};

export const formatPpe = (ppe) =>
  ppe == null
    ? "—"
    : ppe.toLocaleString("en-US", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      });

export default function sortPlayers(list, column, order) {
  const key = columnKeyMap[column] || column;
  const dir = order === "asc" ? 1 : -1;

  return [...list].sort((a, b) => {
    if (column === "player") {
      return dir * a.player.localeCompare(b.player);
    }

    // Players under the min-events threshold have no Points/Event value —
    // they always sort last, in either direction
    if (key === "ppe" && (a.ppe == null || b.ppe == null)) {
      if (a.ppe == null && b.ppe == null) return 0;
      return a.ppe == null ? 1 : -1;
    }

    let valA, valB;
    if (column === "games" || column === "modes") {
      valA = a[column] ? a[column].split(", ").length : 0;
      valB = b[column] ? b[column].split(", ").length : 0;
    } else {
      valA = key.split(".").reduce((obj, keyPart) => obj?.[keyPart] || 0, a);
      valB = key.split(".").reduce((obj, keyPart) => obj?.[keyPart] || 0, b);
    }
    return dir * (valA - valB);
  });
}
