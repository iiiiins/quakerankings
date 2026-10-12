import computeRankings from "./computeRankings";

// "Who was #1" replay. For every year Y in the data, the all-time board is
// computeRankings over events with Year <= Y — the exact board pipeline
// (gear weights, visibility, Power Ranking's best-25 cut), only the year
// range changes. Events have no finer date than Year, so a year is the step.
export const TOP_N = 8;

export default function computeWhoWasOne(tournaments, config, { topN = TOP_N } = {}) {
  const list = Object.values(tournaments || {});
  const years = [...new Set(list.map((t) => t.Year).filter(Boolean))].sort((a, b) => a - b);
  if (!years.length) return { years: [], snapshots: [], reigns: [] };
  const first = years[0];

  const snapshots = years.map((year) => {
    const { players } = computeRankings(list, {
      selectedGame: "All",
      selectedMode: "All",
      lanOnly: false,
      powerRanking: false,
      ...config,
      yearRange: [first, year],
    });
    // `all`: every ranked player's real rank/points that year-end, so the
    // page can plot any added player (not only the top N).
    const all = {};
    players.forEach((p) => {
      all[p.player] = { rank: p.Rank, points: p.points };
    });
    return {
      year,
      top: players.slice(0, topN).map((p) => ({ player: p.player, points: p.points, rank: p.Rank })),
      all,
    };
  });

  const reigns = [];
  snapshots.forEach(({ year, top }) => {
    const leader = top[0]?.player;
    if (!leader) return;
    const last = reigns[reigns.length - 1];
    if (last && last.player === leader && last.to === years[years.indexOf(year) - 1]) last.to = year;
    else reigns.push({ player: leader, from: year, to: year });
  });

  return { years, snapshots, reigns };
}

// Final (latest year-end) board, best first — feeds search + top-25 picker.
export function latestBoard(snapshots) {
  const last = snapshots[snapshots.length - 1];
  if (!last) return [];
  return Object.entries(last.all || {})
    .map(([player, v]) => ({ player, ...v }))
    .sort((a, b) => a.rank - b.rank);
}

// Everyone who ever held #1, in the order they first got there.
export function numberOnes(reigns) {
  return [...new Set(reigns.map((r) => r.player))];
}

// "Contenders": players who never held #1 but kept close. Each year-end in
// the top 8 scores (topN + 1 - rank) — #2 earns 7, #8 earns 1 — summed over
// the whole history, so it rewards both closeness and staying power. Ties:
// more year-ends at #2–#3, then better best rank, then name.
export const CONTENDERS = 5;

export function contenders(snapshots, reigns, { count = CONTENDERS, topN = TOP_N } = {}) {
  const ones = new Set(numberOnes(reigns));
  const stats = {};
  snapshots.forEach(({ top }) =>
    top.forEach(({ player, rank }) => {
      if (ones.has(player)) return;
      const s = (stats[player] ||= { player, score: 0, nearTop: 0, best: rank });
      s.score += topN + 1 - rank;
      if (rank <= 3) s.nearTop++;
      s.best = Math.min(s.best, rank);
    })
  );
  return Object.values(stats)
    .sort((a, b) => b.score - a.score || b.nearTop - a.nearTop || a.best - b.best || a.player.localeCompare(b.player))
    .slice(0, count);
}

// Selection-relative view: each year-end, rank ONLY the selected players
// against each other (by their real overall rank; absent = no points yet =
// no rank). Leader = #1 among the selection; reigns merge consecutive years.
// With the default selection (all real #1 holders included) the leaders and
// reigns equal the global history.
export function selectionView(snapshots, selected) {
  const byYear = snapshots.map(({ year, all = {} }) => {
    const present = selected
      .filter((n) => all[n])
      .sort((a, b) => all[a].rank - all[b].rank);
    const ranks = {};
    present.forEach((n, i) => {
      ranks[n] = i + 1;
    });
    return { year, ranks, leader: present[0] ?? null };
  });
  const reigns = [];
  byYear.forEach(({ year, leader }, i) => {
    if (!leader) return;
    const last = reigns[reigns.length - 1];
    if (last && last.player === leader && byYear[i - 1]?.leader === leader) last.to = year;
    else reigns.push({ player: leader, from: year, to: year });
  });
  return { byYear, reigns };
}

// "Points per year" — same rule as AdvancedStats' "Performance Per Year":
// run computeRankings once over the whole history (so Power Ranking keeps
// each player's best 25 events CAREER-WIDE, exactly like /charts), then sum
// each player's kept tournament points by year. Non-cumulative.
export function pointsPerYear(tournaments, config) {
  const list = Object.values(tournaments || {});
  const years = list.map((t) => t.Year).filter(Boolean);
  if (!years.length) return {};
  const { players } = computeRankings(list, {
    selectedGame: "All",
    selectedMode: "All",
    lanOnly: false,
    powerRanking: false,
    ...config,
    yearRange: [Math.min(...years), Math.max(...years)],
  });
  const out = {};
  players.forEach((p) => {
    const byYear = {};
    p.tournaments.forEach((t) => {
      byYear[t.year] = (byYear[t.year] || 0) + t.points;
    });
    Object.keys(byYear).forEach((y) => (byYear[y] = Math.round(byYear[y])));
    out[p.player] = byYear;
  });
  return out;
}

// Best single-year performer among the selection, per year (null if none of
// them scored). Ties go to selection order.
export function yearBest(perYear, selected, years) {
  return years.map((year) => {
    let best = null;
    selected.forEach((n) => {
      const pts = perYear[n]?.[year];
      if (pts > 0 && (!best || pts > best.points)) best = { player: n, points: pts };
    });
    return { year, ...(best || { player: null, points: 0 }) };
  });
}

// The page's Points-per-year view: always all events (Bruno's call — a single
// year rarely has 25 events, so Power Ranking is ignored there).
export const pointsPerYearForPage = (tournaments, config) =>
  pointsPerYear(tournaments, { ...config, powerRanking: false });
