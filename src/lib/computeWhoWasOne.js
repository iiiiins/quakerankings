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
    return {
      year,
      top: players.slice(0, topN).map((p) => ({ player: p.player, points: p.points, rank: p.Rank })),
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

// Everyone who ever held #1, in the order they first got there.
export function numberOnes(reigns) {
  return [...new Set(reigns.map((r) => r.player))];
}
