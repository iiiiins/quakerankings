import computeWhoWasOne, { numberOnes } from "./computeWhoWasOne";
import {
  DEFAULT_POINTS_CONFIG, DEFAULT_POINTS_VISIBILITY, DEFAULT_GAME_WEIGHTS, DEFAULT_GAME_VISIBILITY,
  DEFAULT_TIER_WEIGHTS, DEFAULT_TIER_VISIBILITY, DEFAULT_MODE_WEIGHTS, DEFAULT_MODE_VISIBILITY,
} from "./formulaDefaults";

const config = {
  pointsConfig: DEFAULT_POINTS_CONFIG, pointsVisibility: DEFAULT_POINTS_VISIBILITY,
  gameWeights: DEFAULT_GAME_WEIGHTS, gameVisibility: DEFAULT_GAME_VISIBILITY,
  tierWeights: DEFAULT_TIER_WEIGHTS, tierVisibility: DEFAULT_TIER_VISIBILITY,
  modeWeights: DEFAULT_MODE_WEIGHTS, modeVisibility: DEFAULT_MODE_VISIBILITY,
};
let id = 0;
const ev = (Year, first, second, Tier = 1) => ({
  id: ++id, Year, Game: "Quake 3", Mode: "Duel", Tier, Event_Name: `E${id}`, "1st": first, "2nd": second,
});

test("replays cumulative boards and merges consecutive reigns", () => {
  const rows = [ev(2000, "a", "b"), ev(2001, "a", "b"), ev(2002, "b", "c"), ev(2002, "b", "c"), ev(2003, "c", "a")];
  const { years, snapshots, reigns } = computeWhoWasOne(rows, config);
  expect(years).toEqual([2000, 2001, 2002, 2003]);
  expect(snapshots[1].top[0]).toEqual({ player: "a", points: 200, rank: 1 });
  expect(snapshots[2].top[0]).toEqual({ player: "b", points: 300, rank: 1 });
  expect(reigns).toEqual([
    { player: "a", from: 2000, to: 2001 },
    { player: "b", from: 2002, to: 2003 },
  ]);
  expect(numberOnes(reigns)).toEqual(["a", "b"]);
});

test("Power Ranking caps each player at their best 25 events per snapshot", () => {
  // "grinder" has 40 tier-5 wins (10 pts each = 400, capped to 250);
  // "star" has 3 tier-1 wins (300). Off: grinder leads. On: star leads.
  const rows = [...Array.from({ length: 40 }, () => ev(2010, "grinder", null, 5)), ev(2010, "star"), ev(2010, "star"), ev(2010, "star")];
  expect(computeWhoWasOne(rows, config).snapshots[0].top[0].player).toBe("grinder");
  const pr = computeWhoWasOne(rows, { ...config, powerRanking: true }).snapshots[0].top;
  expect(pr[0]).toMatchObject({ player: "star", points: 300 });
  expect(pr[1]).toMatchObject({ player: "grinder", points: 250 });
});

test("respects gear visibility (a hidden game doesn't count)", () => {
  const rows = [ev(2000, "a"), { ...ev(2000, "b"), Game: "Quake 2" }, { ...ev(2000, "b"), Game: "Quake 2" }];
  const hidden = { ...config, gameVisibility: { ...DEFAULT_GAME_VISIBILITY, "Quake 2": false } };
  expect(computeWhoWasOne(rows, config).reigns[0].player).toBe("b");
  expect(computeWhoWasOne(rows, hidden).reigns[0].player).toBe("a");
});

test("caps the snapshot at the top 8 and handles no data", () => {
  const rows = Array.from({ length: 12 }, (_, i) => ev(2000, `p${i}`));
  expect(computeWhoWasOne(rows, config).snapshots[0].top).toHaveLength(8);
  expect(computeWhoWasOne([], config)).toEqual({ years: [], snapshots: [], reigns: [] });
});

test("contenders: never-#1 players ranked by summed top-8 closeness", async () => {
  const { contenders } = await import("./computeWhoWasOne");
  const snap = (year, names) => ({ year, top: names.map((player, i) => ({ player, points: 0, rank: i + 1 })) });
  const snapshots = [snap(2000, ["a", "b", "c", "d"]), snap(2001, ["a", "c", "b", "e"]), snap(2002, ["a", "b", "d", "c"])];
  const reigns = [{ player: "a", from: 2000, to: 2002 }];
  // b: 7+6+7=20, c: 6+7+5=18, d: 5+6=11, e: 5
  expect(contenders(snapshots, reigns).map((c) => c.player)).toEqual(["b", "c", "d", "e"]);
  expect(contenders(snapshots, reigns, { count: 2 })[0]).toMatchObject({ player: "b", score: 20, nearTop: 3, best: 2 });
});

test("Power Ranking can turn a #1 holder into a contender", async () => {
  const { contenders } = await import("./computeWhoWasOne");
  const rows = [...Array.from({ length: 40 }, () => ev(2010, "grinder", null, 5)), ev(2010, "star"), ev(2010, "star"), ev(2010, "star")];
  const off = computeWhoWasOne(rows, config);
  const on = computeWhoWasOne(rows, { ...config, powerRanking: true });
  expect(contenders(off.snapshots, off.reigns)[0].player).toBe("star");
  expect(contenders(on.snapshots, on.reigns)[0].player).toBe("grinder");
});

test("snapshots carry every player's real rank; latestBoard sorts the final year", async () => {
  const { latestBoard } = await import("./computeWhoWasOne");
  const rows = Array.from({ length: 10 }, (_, i) => ev(2000, `p${i}`, null, (i % 5) + 1));
  const { snapshots } = computeWhoWasOne(rows, config);
  expect(Object.keys(snapshots[0].all)).toHaveLength(10);
  expect(snapshots[0].top).toHaveLength(8);
  const board = latestBoard(snapshots);
  expect(board[0].rank).toBe(1);
  expect(board.map((p) => p.rank)).toEqual([...board.map((p) => p.rank)].sort((a, b) => a - b));
  expect(latestBoard([])).toEqual([]);
});

test("selectionView ranks only the selection; default selection reproduces global reigns", async () => {
  const { selectionView, contenders } = await import("./computeWhoWasOne");
  const rows = [ev(2000, "a", "b"), ev(2001, "a", "b"), ev(2002, "b", "c"), ev(2002, "b", "c"), ev(2003, "c", "a"), ev(2003, "d", "e")];
  const { snapshots, reigns } = computeWhoWasOne(rows, config);
  const defaults = [...numberOnes(reigns), ...contenders(snapshots, reigns).map((c) => c.player)];
  expect(selectionView(snapshots, defaults).reigns).toEqual(reigns);

  // without the global leaders, the best of the rest leads
  const v = selectionView(snapshots, ["c", "d", "e"]);
  expect(v.byYear[0]).toEqual({ year: 2000, ranks: {}, leader: null });
  expect(v.byYear[2].ranks).toEqual({ c: 1 });
  expect(v.byYear[3].ranks).toEqual({ c: 1, d: 2, e: 3 });
  expect(v.reigns).toEqual([{ player: "c", from: 2002, to: 2003 }]);
  // ranks are dense 1..n among the selection
  expect(Object.values(v.byYear[3].ranks).sort()).toEqual([1, 2, 3]);
});

test("selectionView: a gap year breaks a reign", async () => {
  const { selectionView } = await import("./computeWhoWasOne");
  const snaps = [
    { year: 1, all: { x: { rank: 1 } } },
    { year: 2, all: {} },
    { year: 3, all: { x: { rank: 4 } } },
  ];
  expect(selectionView(snaps, ["x"]).reigns).toEqual([
    { player: "x", from: 1, to: 1 },
    { player: "x", from: 3, to: 3 },
  ]);
});

test("pointsPerYear: non-cumulative, and Power Ranking keeps the career-best 25", async () => {
  const { pointsPerYear, yearBest } = await import("./computeWhoWasOne");
  const rows = [ev(2000, "a", "b"), ev(2001, "a"), ev(2001, "b"), ev(2001, "b")];
  const py = pointsPerYear(rows, config);
  expect(py.a).toEqual({ 2000: 100, 2001: 100 });
  expect(py.b).toEqual({ 2000: 50, 2001: 200 });
  expect(yearBest(py, ["a", "b"], [2000, 2001, 2002])).toEqual([
    { year: 2000, player: "a", points: 100 },
    { year: 2001, player: "b", points: 200 },
    { year: 2002, player: null, points: 0 },
  ]);
  expect(yearBest(py, ["b"], [2000])[0].player).toBe("b");

  // 30 tier-5 wins in 2000 (10 pts each) + 1 tier-1 win in 2001: best 25 = the
  // 2001 win + 24 of the 2000 ones.
  const pr = [...Array.from({ length: 30 }, () => ev(2000, "g", null, 5)), ev(2001, "g")];
  expect(pointsPerYear(pr, config).g).toEqual({ 2000: 300, 2001: 100 });
  expect(pointsPerYear(pr, { ...config, powerRanking: true }).g).toEqual({ 2000: 240, 2001: 100 });
  expect(pointsPerYear([], config)).toEqual({});
});

test("Points per year ignores Power Ranking when called the way the page does", async () => {
  const { pointsPerYearForPage, yearBest } = await import("./computeWhoWasOne");
  const pr = [...Array.from({ length: 30 }, () => ev(2000, "h", null, 5)), ev(2001, "h")];
  const page = (powerRanking) => pointsPerYearForPage(pr, { ...config, powerRanking });
  expect(page(true)).toEqual(page(false));
  expect(page(true).h).toEqual({ 2000: 300, 2001: 100 });
  // best-that-year uses all events too
  expect(yearBest(page(true), ["h"], [2000])[0]).toEqual({ year: 2000, player: "h", points: 300 });
});

test("filters feed the replay: year range restarts totals, game/mode/LAN narrow events", async () => {
  const { pointsPerYearForPage } = await import("./computeWhoWasOne");
  const rows = [
    ev(2000, "a"), ev(2000, "a"), ev(2000, "a"),
    ev(2001, "b"), ev(2002, "b"),
    { ...ev(2002, "c"), Game: "Quake World", LAN: true },
    { ...ev(2002, "c"), Game: "Quake World", Mode: "TDM", LAN: true },
  ];
  // All years: a (300) leads throughout.
  expect(computeWhoWasOne(rows, config).reigns[0]).toEqual({ player: "a", from: 2000, to: 2002 });
  // Range 2001–2002: a's 2000 wins don't count, years start at 2001.
  const r = computeWhoWasOne(rows, { ...config, yearRange: [2001, 2002] });
  expect(r.years).toEqual([2001, 2002]);
  expect(r.snapshots[0].all.a).toBeUndefined();
  expect(r.snapshots[1].top[0]).toMatchObject({ player: "b", points: 200 });
  expect(r.snapshots[1].all.c.points).toBe(200);
  // Game filter
  const qw = computeWhoWasOne(rows, { ...config, selectedGame: "Quake World" });
  expect(qw.years).toEqual([2000, 2001, 2002]);
  expect(Object.keys(qw.snapshots[2].all)).toEqual(["c"]);
  // Mode + LAN
  expect(computeWhoWasOne(rows, { ...config, selectedMode: "TDM" }).snapshots[2].all.c.points).toBe(100);
  expect(Object.keys(computeWhoWasOne(rows, { ...config, lanOnly: true }).snapshots[2].all)).toEqual(["c"]);
  // Points per year respects the range too
  expect(pointsPerYearForPage(rows, { ...config, yearRange: [2001, 2002] }).a).toBeUndefined();
});
