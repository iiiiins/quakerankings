// Likely duplicate players (one person under two spellings, e.g. "busdriver"
// and "busdriverx"), plus names that break the data's own rules, and the
// row-by-row plan to merge or rename them. Pure: the admin page passes the
// write function to applyPlan, so tests run it against a fake.
//
// A pair is listed only when the two names NEVER finished in the same event
// (two names in one top 8 are two people). Rules, strongest first:
//   case      same letters, other capitals or spaces    "WOLFCLAW" / "wolfclaw"
//   symbols   same after dropping spaces and . _ - etc  "inz" / "inz_"
//   leet      same after 0>o 1>i 3>e 4>a 5>s 7>t l>i    "purp1ef1sh" / "purplefish"
//   affix     same after dropping a leading/trailing x or trailing digits
//                                                       "busdriverx" / "busdriver"
//   lookalike one letter apart (two for 9+ letters) and sharing a game
// Evidence: each name's events, years and games, and the rivals both names
// shared a top 8 with. STRONG = 5+ shared rivals that make up 30%+ of the
// smaller name's rivals: the same crowd, so very likely the same person.

const SLOTS = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th"];
export const STRONG_SHARED = 5;
export const STRONG_OVERLAP = 0.3;

const caseKey = (n) => n.toLowerCase().replace(/\s+/g, " ").trim();
const symbolKey = (n) => caseKey(n).replace(/[^a-z0-9]/g, "");
const LEET = { 0: "o", 1: "i", 3: "e", 4: "a", 5: "s", 7: "t", l: "i" };
const leetKey = (n) => symbolKey(n).replace(/[013457l]/g, (c) => LEET[c]);
const affixKey = (n) => {
  const k = leetKey(n).replace(/[0-9]+$/, "");
  const trimmed = k.replace(/^x+|x+$/g, "");
  return trimmed.length >= 4 ? trimmed : k;
};
const RULES = [
  ["case", caseKey],
  ["symbols", symbolKey],
  ["leet", leetKey],
  ["affix", affixKey],
];
const RULE_ORDER = ["case", "symbols", "leet", "affix", "lookalike"];

function editDistance(a, b, cap) {
  if (Math.abs(a.length - b.length) > cap) return cap + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      rowMin = Math.min(rowMin, cur[j]);
    }
    if (rowMin > cap) return cap + 1;
    prev = cur;
  }
  return prev[b.length];
}

const eventKey = (r) => `${r.Event_Name}|${r.Year}|${r.Game}|${r.Mode}`.toLowerCase();

function playerStats(rows) {
  const players = new Map();
  rows.forEach((r) => {
    const names = SLOTS.map((s) => r[s]).filter(Boolean);
    names.forEach((n) => {
      if (!players.has(n)) {
        players.set(n, { name: n, events: new Set(), years: new Set(), games: new Set(), rivals: new Set() });
      }
      const p = players.get(n);
      p.events.add(eventKey(r));
      p.years.add(r.Year);
      p.games.add(r.Game);
      names.forEach((o) => o !== n && p.rivals.add(o));
    });
  });
  return players;
}

const span = (s) => {
  const ys = [...s].filter((y) => y != null).sort((x, y) => x - y);
  if (!ys.length) return "";
  return ys[0] === ys[ys.length - 1] ? `${ys[0]}` : `${ys[0]}–${ys[ys.length - 1]}`;
};

// rows -> [{ rule, strong, a, b, sharedRivals, overlap }], strongest first.
// a / b = { name, events, years, games }
export function findDuplicates(rows) {
  const players = playerStats(rows || []);
  const list = [...players.values()];
  const pairs = new Map();
  const together = (a, b) => [...a.events].some((e) => b.events.has(e));
  const add = (a, b, rule) => {
    const [x, y] = a.name < b.name ? [a, b] : [b, a];
    const id = `${x.name}\u0000${y.name}`;
    if (pairs.has(id) || together(x, y)) return;
    pairs.set(id, { x, y, rule });
  };

  RULES.forEach(([rule, key]) => {
    const groups = new Map();
    list.forEach((p) => {
      const k = key(p.name);
      if (!k) return;
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(p);
    });
    groups.forEach((g) => {
      for (let i = 0; i < g.length; i++) for (let j = i + 1; j < g.length; j++) add(g[i], g[j], rule);
    });
  });

  // lookalikes: one letter apart (two for long names), sharing a game
  const byLen = new Map();
  list.forEach((p) => {
    const k = leetKey(p.name);
    if (k.length < 5) return;
    if (!byLen.has(k.length)) byLen.set(k.length, []);
    byLen.get(k.length).push([k, p]);
  });
  byLen.forEach((group, len) => {
    [len, len + 1, len + 2].forEach((len2) => {
      const other = byLen.get(len2);
      if (!other) return;
      group.forEach(([ka, a]) =>
        other.forEach(([kb, b]) => {
          if (a === b || ka === kb) return;
          const cap = Math.min(ka.length, kb.length) >= 9 ? 2 : 1;
          if (Math.abs(ka.length - kb.length) > cap) return;
          if (![...a.games].some((g) => b.games.has(g))) return;
          if (editDistance(ka, kb, cap) <= cap) add(a, b, "lookalike");
        })
      );
    });
  });

  const side = (p) => ({
    name: p.name,
    events: p.events.size,
    years: span(p.years),
    games: [...p.games].sort(),
  });
  return [...pairs.values()]
    .map(({ x, y, rule }) => {
      const sharedRivals = [...x.rivals].filter((r) => y.rivals.has(r)).length;
      const smaller = Math.min(x.rivals.size, y.rivals.size) || 1;
      const overlap = sharedRivals / smaller;
      return {
        rule,
        a: side(x),
        b: side(y),
        sharedRivals,
        overlap,
        strong: sharedRivals >= STRONG_SHARED && overlap >= STRONG_OVERLAP,
      };
    })
    .sort(
      (p, q) =>
        q.strong - p.strong ||
        (p.strong ? q.sharedRivals - p.sharedRivals : 0) ||
        RULE_ORDER.indexOf(p.rule) - RULE_ORDER.indexOf(q.rule) ||
        q.sharedRivals - p.sharedRivals ||
        (p.a.name < q.a.name ? -1 : 1)
    );
}

// Names that break the data's own rules: the player page looks names up in
// lowercase, so capitals or stray spaces hide a player; a game or mode name
// in a placement slot is a typo in the row.
const GAME_OR_MODE = new Set([
  "quake world", "quake 2", "quake 3", "quake 4", "quake live", "quake champions", "diabotical",
  "duel", "2v2", "tdm", "ctf", "ca", "sac", "wip", "dbt",
]);
export function oddNames(rows) {
  const seen = new Map();
  (rows || []).forEach((r) =>
    SLOTS.forEach((slot) => {
      const n = r[slot];
      if (!n) return;
      const why = [];
      if (n !== n.toLowerCase()) why.push("capitals");
      if (n !== n.trim() || /\s{2,}/.test(n)) why.push("extra spaces");
      if (GAME_OR_MODE.has(n.trim().toLowerCase())) why.push("a game or mode name");
      if (!why.length) return;
      if (!seen.has(n)) seen.set(n, { name: n, why: why.join(", "), rowIds: [] });
      const ids = seen.get(n).rowIds;
      if (!ids.includes(r.id)) ids.push(r.id);
    })
  );
  return [...seen.values()];
}

// the stored form of a name: lowercase, trimmed (tournamentRules.normalizeRow)
export const cleanName = (n) => String(n || "").trim().toLowerCase();

// Every row where `from` appears, and the patch that renames it to `to`.
// -> { to, changes: [{ id, event, year, game, mode, slots, patch }],
//      conflicts: [{ id, event, year }] }  (rows that already hold `to`)
// A merge is a rename of the name being dropped into the name being kept.
export function planRename(rows, from, toRaw) {
  const to = cleanName(toRaw);
  const changes = [];
  const conflicts = [];
  (rows || []).forEach((r) => {
    const slots = SLOTS.filter((s) => r[s] === from);
    if (!slots.length) return;
    const where = { id: r.id, event: r.Event_Name, year: r.Year, game: r.Game, mode: r.Mode };
    if (SLOTS.some((s) => !slots.includes(s) && cleanName(r[s]) === to)) {
      conflicts.push(where);
      return;
    }
    const patch = {};
    slots.forEach((s) => (patch[s] = to));
    changes.push({ ...where, slots, patch });
  });
  changes.sort((x, y) => x.id - y.id);
  return { from, to, changes, conflicts };
}

// Run a plan row by row through `update(id, patch)` -> { error? }.
// Stops at the first failure; never runs with conflicts or an empty target.
// -> { done: [ids], failed: { id, message } | null }
export async function applyPlan(plan, update) {
  const done = [];
  if (!plan.to) return { done, failed: { id: null, message: "The new name is empty." } };
  if (plan.conflicts.length) {
    return { done, failed: { id: plan.conflicts[0].id, message: "A row already has the new name." } };
  }
  for (let i = 0; i < plan.changes.length; i++) {
    const c = plan.changes[i];
    const res = await update(c.id, c.patch);
    if (res && res.error) return { done, failed: { id: c.id, message: res.error.message || String(res.error) } };
    done.push(c.id);
  }
  return { done, failed: null };
}
