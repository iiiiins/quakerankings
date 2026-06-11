// Groups raw Supabase tournament rows into browsable events.
//
// Team modes store one row per player group under the same
// Event_Name+Year+Game+Mode — those rows merge into a single event whose
// placement buckets hold every rostered player. Same-name events in other
// games/modes (e.g. QuakeCon Duel vs QuakeCon CTF) stay separate entries.
// Pure and scoring-config independent: the browser shows the raw dataset.

const SLOT_BUCKETS = [
  ["1st", "first"],
  ["2nd", "second"],
  ["3rd", "top4"],
  ["4th", "top4"],
  ["5th", "top8"],
  ["6th", "top8"],
  ["7th", "top8"],
  ["8th", "top8"],
];

export default function groupEvents(tournamentList) {
  const rows = Object.values(tournamentList || {});
  const groups = new Map();

  // id order keeps merged roster order stable regardless of fetch order
  [...rows]
    .sort((a, b) => (a.id || 0) - (b.id || 0))
    .forEach((row) => {
      // same skip rule as computeRankings (which already reports these rows)
      if (!row.Game || !row.Mode || !row.Tier || !row.Year) return;

      const key =
        `${row.Event_Name}|${row.Year}|${row.Game}|${row.Mode}`.toLowerCase();
      let ev = groups.get(key);
      if (!ev) {
        ev = {
          key,
          name: row.Event_Name,
          year: row.Year,
          game: row.Game,
          mode: row.Mode,
          tier: row.Tier,
          lan: Boolean(row.LAN),
          prizepool: row.Prizepool ?? null,
          placements: { first: [], second: [], top4: [], top8: [] },
          rowCount: 0,
        };
        groups.set(key, ev);
      }

      ev.rowCount++;
      // rare data inconsistencies across merged rows, resolved deterministically:
      // best tier, any LAN, largest prize pool
      ev.tier = Math.min(ev.tier, row.Tier);
      ev.lan = ev.lan || Boolean(row.LAN);
      if (row.Prizepool != null) {
        ev.prizepool =
          ev.prizepool == null
            ? row.Prizepool
            : Math.max(ev.prizepool, row.Prizepool);
      }

      SLOT_BUCKETS.forEach(([slot, bucket]) => {
        const name = row[slot];
        if (name && !ev.placements[bucket].includes(name)) {
          ev.placements[bucket].push(name);
        }
      });
    });

  return Array.from(groups.values());
}
