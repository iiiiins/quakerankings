// Pins the scoring pipeline every board reads from: how weights compose into
// points, which rows the filters drop and which of those the UI is told about,
// the two visibility maps that default in OPPOSITE directions, what Power
// Ranking rewrites, and when Pts/Event is allowed to exist at all.
//
// These are business rules, not implementation details — a change here changes
// what the site claims about a player's career.

import computeRankings, { missingFields } from "./computeRankings";
import {
  YEAR_MIN,
  DEFAULT_POINTS_CONFIG,
  DEFAULT_POINTS_VISIBILITY,
  DEFAULT_GAME_WEIGHTS,
  DEFAULT_GAME_VISIBILITY,
  DEFAULT_TIER_WEIGHTS,
  DEFAULT_TIER_VISIBILITY,
  DEFAULT_MODE_WEIGHTS,
  DEFAULT_MODE_VISIBILITY,
} from "./formulaDefaults";

let id = 0;
beforeEach(() => {
  id = 0;
});

const row = (over = {}) => {
  id += 1;
  return {
    id,
    Event_Name: `Event ${id}`,
    Game: "Quake 3",
    Mode: "Duel",
    Tier: 1,
    Year: 2005,
    LAN: true,
    ...over,
  };
};

const baseConfig = () => ({
  selectedGame: "All",
  selectedMode: "All",
  yearRange: [YEAR_MIN, 2030],
  lanOnly: false,
  powerRanking: false,
  pointsConfig: { ...DEFAULT_POINTS_CONFIG },
  pointsVisibility: { ...DEFAULT_POINTS_VISIBILITY },
  gameWeights: { ...DEFAULT_GAME_WEIGHTS },
  gameVisibility: { ...DEFAULT_GAME_VISIBILITY },
  tierWeights: { ...DEFAULT_TIER_WEIGHTS },
  tierVisibility: { ...DEFAULT_TIER_VISIBILITY },
  modeWeights: { ...DEFAULT_MODE_WEIGHTS },
  modeVisibility: { ...DEFAULT_MODE_VISIBILITY },
});

const run = (rows, over = {}) => computeRankings(rows, { ...baseConfig(), ...over });
const byName = (players, name) => players.find((p) => p.player === name);

describe("points", () => {
  test("tier, game and mode weights multiply — they do not add", () => {
    // tier 2 = 60%, game at 50%, mode at 50% => 100 * .6 * .5 * .5 = 15
    const { players } = run([row({ Tier: 2, "1st": "alpha" })], {
      gameWeights: { ...DEFAULT_GAME_WEIGHTS, "Quake 3": 50 },
      modeWeights: { ...DEFAULT_MODE_WEIGHTS, Duel: 50 },
    });
    expect(byName(players, "alpha").points).toBe(15);
  });

  test("an unknown game, tier or mode scores at full weight rather than zero", () => {
    // Ranking a newly imported event must not silently score it as worthless.
    const { players } = run([
      row({ Game: "Reflex", Mode: "Duel", Tier: 9, "1st": "alpha" }),
    ]);
    expect(byName(players, "alpha").points).toBe(DEFAULT_POINTS_CONFIG.first);
  });

  test("3rd and 4th are both top4; 5th through 8th are all top8", () => {
    const rows = [
      row({ "3rd": "alpha", "4th": "bravo" }),
      row({ "5th": "charlie", "6th": "delta", "7th": "echo", "8th": "foxtrot" }),
    ];
    const { players } = run(rows);
    expect(byName(players, "alpha").points).toBe(DEFAULT_POINTS_CONFIG.top4);
    expect(byName(players, "bravo").points).toBe(DEFAULT_POINTS_CONFIG.top4);
    ["charlie", "delta", "echo", "foxtrot"].forEach((name) => {
      expect(byName(players, name).points).toBe(DEFAULT_POINTS_CONFIG.top8);
    });
  });

  test("ranks are 1-indexed and follow descending points", () => {
    // Rows are fed WORST-FIRST on purpose. Players enter playerStats in the order
    // their names first appear, so listing alpha first would hand the sort an
    // already-descending array — and a comparator that always returns positive
    // leaves such an array untouched, letting `b.points - a.points` be swapped
    // for `+` with this assertion still passing. Feeding charlie first forces the
    // sort to actually reorder. See flag f9c485.
    const rows = [
      row({ "2nd": "charlie" }),
      row({ "1st": "bravo" }),
      row({ "1st": "alpha" }),
      row({ "1st": "alpha" }),
    ];
    const { players } = run(rows);
    expect(players.map((p) => [p.player, p.Rank])).toEqual([
      ["alpha", 1],
      ["bravo", 2],
      ["charlie", 3],
    ]);
  });

  test("a player's games and modes come back as display strings, deduplicated", () => {
    const rows = [
      row({ Game: "Quake 3", Mode: "Duel", "1st": "alpha" }),
      row({ Game: "Quake 3", Mode: "CTF", "1st": "alpha" }),
      row({ Game: "Quake Live", Mode: "Duel", "1st": "alpha" }),
    ];
    const { players } = run(rows);
    expect(byName(players, "alpha").games).toBe("Quake 3, Quake Live");
    expect(byName(players, "alpha").modes).toBe("Duel, CTF");
  });
});

describe("filters", () => {
  test("the year range includes both of its own bounds", () => {
    const rows = [
      row({ Year: 2004, "1st": "early" }),
      row({ Year: 2005, "1st": "lower" }),
      row({ Year: 2007, "1st": "upper" }),
      row({ Year: 2008, "1st": "late" }),
    ];
    const { players } = run(rows, { yearRange: [2005, 2007] });
    expect(players.map((p) => p.player).sort()).toEqual(["lower", "upper"]);
  });

  test("lanOnly drops online events", () => {
    const rows = [row({ LAN: true, "1st": "alpha" }), row({ LAN: false, "1st": "bravo" })];
    const { players } = run(rows, { lanOnly: true });
    expect(players.map((p) => p.player)).toEqual(["alpha"]);
  });

  test("filteredCount reports the rows the filters removed, against the raw total", () => {
    // The board shows this pair as "N of M" — they must stay consistent.
    const rows = [
      row({ Game: "Quake 3", "1st": "alpha" }),
      row({ Game: "Quake Live", "1st": "bravo" }),
      row({ Game: "Quake Live", "1st": "charlie" }),
    ];
    const { players, filteredCount, totalTournaments } = run(rows, { selectedGame: "Quake 3" });
    expect(totalTournaments).toBe(3);
    expect(filteredCount).toBe(2);
    expect(players).toHaveLength(1);
  });

  test("the mode filter drops rows and counts them, same as the game filter", () => {
    // The Game filter above was covered; Mode was not, so inverting its `!==` to
    // `===` changed nothing any test could see. Every fixture row is Duel and every
    // test left selectedMode on "All". See flag ba438b.
    const rows = [
      row({ Mode: "Duel", "1st": "alpha" }),
      row({ Mode: "TDM", "1st": "bravo" }),
      row({ Mode: "CTF", "1st": "charlie" }),
    ];
    const { players, filteredCount, totalTournaments } = run(rows, { selectedMode: "Duel" });
    expect(totalTournaments).toBe(3);
    expect(filteredCount).toBe(2);
    expect(players.map((p) => p.player)).toEqual(["alpha"]);
  });

  test("an incomplete row counts as filtered, so the tally still adds up", () => {
    // Resolves flag 276bbc. Bruno's call: a row missing Game/Mode/Tier/Year is
    // almost always a half-finished entry of his own — placements typed in, tier
    // or year forgotten — so it should stay OUT of the scoring but be counted,
    // and surfaced by name on the admin page rather than vanishing.
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    const rows = [row({ "1st": "alpha" }), row({ Tier: null, "1st": "bravo" })];
    const { players, filteredCount, totalTournaments } = run(rows);
    expect(totalTournaments).toBe(2);
    expect(filteredCount).toBe(1);
    expect(totalTournaments - filteredCount).toBe(1); // the line the board shows
    expect(players.map((p) => p.player)).toEqual(["alpha"]);
    expect(spy).toHaveBeenCalledWith("Invalid tournament entry:", expect.anything());
    spy.mockRestore();
  });
});

describe("missingFields", () => {
  // One definition of "incomplete", shared by the scoring and the admin list, so
  // the page can never disagree with the pipeline about which rows are broken.
  test("a complete row is missing nothing", () => {
    expect(missingFields(row())).toEqual([]);
  });

  test("it names every absent field, in a stable order", () => {
    expect(missingFields(row({ Tier: null, Year: null }))).toEqual(["Tier", "Year"]);
    expect(missingFields(row({ Game: "", Mode: undefined }))).toEqual(["Game", "Mode"]);
    expect(missingFields({})).toEqual(["Game", "Mode", "Tier", "Year"]);
  });

  test("a missing row is treated as missing everything rather than throwing", () => {
    // The first render happens before the fetch resolves.
    expect(missingFields(undefined)).toEqual(["Game", "Mode", "Tier", "Year"]);
  });

  test("the rows it names are exactly the rows the scoring drops", () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    const rows = [row({ "1st": "alpha" }), row({ Year: null, "1st": "bravo" })];
    const broken = rows.filter((r) => missingFields(r).length);
    const { filteredCount } = run(rows);
    expect(broken).toHaveLength(1);
    expect(filteredCount).toBe(broken.length);
    spy.mockRestore();
  });
});

describe("visibility", () => {
  test("a missing game/tier/mode visibility key means VISIBLE", () => {
    // These maps read `?? true`, so a game added to the data before it is added
    // to the defaults still scores.
    const { players } = run([row({ Game: "Reflex", "1st": "alpha" })], {
      gameVisibility: {},
      tierVisibility: {},
      modeVisibility: {},
    });
    expect(byName(players, "alpha").points).toBe(DEFAULT_POINTS_CONFIG.first);
  });

  test("a missing placement visibility key means HIDDEN — the opposite default", () => {
    // pointsVisibility reads `!visibility[key]`, with no `?? true`. The asymmetry
    // against the maps above is real and easy to trip over when adding a placement.
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    const { players } = run([row({ "1st": "alpha" })], { pointsVisibility: {} });
    expect(players).toHaveLength(0);
    expect(spy).toHaveBeenCalledWith("No players found in playerStats.");
    spy.mockRestore();
  });

  test("hiding a placement removes a player who has nothing else", () => {
    const rows = [row({ "1st": "alpha", "5th": "bravo" })];
    const { players } = run(rows, {
      pointsVisibility: { ...DEFAULT_POINTS_VISIBILITY, top8: false },
    });
    expect(players.map((p) => p.player)).toEqual(["alpha"]);
    expect(byName(players, "alpha").points).toBe(DEFAULT_POINTS_CONFIG.first);
  });

  test("hiding a game removes its results without touching another game's", () => {
    const rows = [
      row({ Game: "Quake 3", "1st": "alpha" }),
      row({ Game: "Quake Live", "1st": "alpha" }),
      row({ Game: "Quake Live", "1st": "bravo" }),
    ];
    const { players } = run(rows, {
      gameVisibility: { ...DEFAULT_GAME_VISIBILITY, "Quake Live": false },
    });
    expect(players.map((p) => p.player)).toEqual(["alpha"]);
    expect(byName(players, "alpha").points).toBe(DEFAULT_POINTS_CONFIG.first);
  });
});

describe("power ranking", () => {
  // The weak results are listed FIRST on purpose. Power ranking keeps the top 25 by
  // sorting player.tournaments then slicing, so a fixture already in descending order
  // lets a broken comparator keep the right events by accident — which is exactly how
  // `sort((a, b) => b.points - a.points)` at computeRankings.js:139 could be swapped
  // for `+` with these tests still green. Worst-first forces the sort to do the work.
  const thirty = () => [
    ...Array.from({ length: 5 }, () => row({ Tier: 5, "1st": "alpha" })), // 10 each
    ...Array.from({ length: 25 }, () => row({ Tier: 1, "1st": "alpha" })), // 100 each
  ];

  test("off: every result counts", () => {
    const { players } = run(thirty());
    expect(byName(players, "alpha").points).toBe(25 * 100 + 5 * 10);
    expect(byName(players, "alpha").participations).toBe(30);
  });

  test("on: only the best 25 results count, and the weak ones are dropped", () => {
    const { players } = run(thirty(), { powerRanking: true });
    const alpha = byName(players, "alpha");
    expect(alpha.points).toBe(2500);
    expect(alpha.participations).toBe(25);
    expect(alpha.placements.first).toBe(25);
  });

  test("on: player.tournaments is truncated too, not just the total", () => {
    // AdvancedStats plots player.tournaments directly — if the array kept all 30
    // while points counted 25, the charts would disagree with the table.
    const { players } = run(thirty(), { powerRanking: true });
    const alpha = byName(players, "alpha");
    expect(alpha.tournaments).toHaveLength(25);
    expect(alpha.tournaments.every((t) => t.points === 100)).toBe(true);
    expect(alpha.points).toBe(alpha.tournaments.reduce((s, t) => s + t.points, 0));
  });
});

describe("points per event", () => {
  const events = (n, name) => Array.from({ length: n }, () => row({ "1st": name }));

  test("stays null below the minimum sample size", () => {
    const { players } = run(events(14, "alpha"), { minEventsForPpe: 15 });
    expect(byName(players, "alpha").ppe).toBeNull();
  });

  test("exists at exactly the minimum", () => {
    const { players } = run(events(15, "alpha"), { minEventsForPpe: 15 });
    expect(byName(players, "alpha").ppe).toBe(100);
  });

  test("is computed from the post-Power-Ranking totals, not the raw ones", () => {
    // Power Ranking rewrites both points and participations, so Pts/Event has to
    // be derived after that rewrite or it reports a number from a discarded set.
    const rows = [
      ...Array.from({ length: 25 }, () => row({ Tier: 1, "1st": "alpha" })),
      ...Array.from({ length: 5 }, () => row({ Tier: 5, "1st": "alpha" })),
    ];
    const { players } = run(rows, { powerRanking: true, minEventsForPpe: 15 });
    expect(byName(players, "alpha").ppe).toBe(100);
  });
});

describe("empty input", () => {
  test("an undefined tournament list yields nothing rather than throwing", () => {
    // The first render happens before the Supabase fetch resolves.
    const { players, filteredCount, totalTournaments } = run(undefined);
    expect(players).toEqual([]);
    expect(filteredCount).toBe(0);
    expect(totalTournaments).toBe(0);
  });
});
