// Player selection for the Who-was-#1 charts. `selection` is null while the
// visitor hasn't touched it (= the live default: #1 holders + contenders, so
// it follows formula changes) and an explicit name list once they add or
// remove someone. Reset = back to null.
export const resolveSelection = (selection, defaults) => selection ?? defaults;

export function addPlayer(selection, defaults, name) {
  const cur = resolveSelection(selection, defaults);
  return cur.includes(name) ? cur : [...cur, name];
}

export function removePlayer(selection, defaults, name) {
  return resolveSelection(selection, defaults).filter((n) => n !== name);
}

export function togglePlayer(selection, defaults, name) {
  const cur = resolveSelection(selection, defaults);
  return cur.includes(name) ? removePlayer(selection, defaults, name) : addPlayer(selection, defaults, name);
}

// Autocomplete, same rule as AdvancedStats: substring, case-insensitive, 10 max,
// skipping players already on the chart.
export function searchPlayers(board, query, selected, limit = 10) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return board.filter((p) => p.player.toLowerCase().includes(q) && !selected.includes(p.player)).slice(0, limit);
}
