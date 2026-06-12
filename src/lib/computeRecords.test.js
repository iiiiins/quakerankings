// Pins the records business rules: visibility toggles flow through to every
// record, the GF min-N guard, inclusive career spans, and the prize list's
// event filtering. Rows go through the REAL computeRankings + groupEvents
// pipeline — that pairing is computeRecords' input contract.

import computeRecords, {
  RECORD_LIMIT,
  MIN_GRAND_FINALS,
} from "./computeRecords";
import computeRankings from "./computeRankings";
import groupEvents from "./groupEvents";
import {
  CURRENT_YEAR,
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
    Prizepool: null,
    ...over,
  };
};

const baseConfig = () => ({
  pointsConfig: { ...DEFAULT_POINTS_CONFIG },
  pointsVisibility: { ...DEFAULT_POINTS_VISIBILITY },
  gameWeights: { ...DEFAULT_GAME_WEIGHTS },
  gameVisibility: { ...DEFAULT_GAME_VISIBILITY },
  tierWeights: { ...DEFAULT_TIER_WEIGHTS },
  tierVisibility: { ...DEFAULT_TIER_VISIBILITY },
  modeWeights: { ...DEFAULT_MODE_WEIGHTS },
  modeVisibility: { ...DEFAULT_MODE_VISIBILITY },
});

// records take the gear config with NEUTRAL filters — never the home board's
const run = (rows, configOver = {}) => {
  const config = { ...baseConfig(), ...configOver };
  const { players } = computeRankings(rows, {
    selectedGame: "All",
    selectedMode: "All",
    yearRange: [YEAR_MIN, CURRENT_YEAR],
    lanOnly: false,
    powerRanking: false,
    ...config,
  });
  return computeRecords(players, groupEvents(rows), config);
};

describe("most titles", () => {
  test("counts firsts and orders by count", () => {
    const rows = [
      row({ "1st": "alpha" }),
      row({ "1st": "alpha" }),
      row({ "1st": "alpha" }),
      row({ "1st": "bravo", "2nd": "alpha" }),
      row({ "1st": "bravo" }),
      row({ "1st": "charlie" }),
    ];
    const { mostTitles } = run(rows);
    expect(mostTitles.map((r) => [r.player, r.titles])).toEqual([
      ["alpha", 3],
      ["bravo", 2],
      ["charlie", 1],
    ]);
    expect(mostTitles[0].events).toBe(4); // 3 wins + 1 second
  });

  test("a hidden game's titles don't count while hidden", () => {
    const rows = [
      row({ Game: "Quake 3", "1st": "alpha" }),
      row({ Game: "Quake 3", "1st": "alpha" }),
      row({ Game: "Quake 4", "1st": "alpha" }),
      row({ Game: "Quake 4", "1st": "bravo" }), // bravo exists only in Quake 4
    ];
    const all = run(rows);
    expect(all.mostTitles[0]).toMatchObject({ player: "alpha", titles: 3 });

    const hidden = run(rows, {
      gameVisibility: { ...DEFAULT_GAME_VISIBILITY, "Quake 4": false },
    });
    expect(hidden.mostTitles[0]).toMatchObject({ player: "alpha", titles: 2 });
    // a player whose whole career is hidden vanishes from the records
    expect(hidden.mostTitles.map((r) => r.player)).not.toContain("bravo");
  });
});

describe("titles by game", () => {
  test("one row per visible game, co-leaders listed together", () => {
    const rows = [
      row({ Game: "Quake 3", "1st": "alpha" }),
      row({ Game: "Quake 3", "1st": "bravo" }),
      row({ Game: "Quake 4", "1st": "charlie" }),
    ];
    const { titlesByGame } = run(rows, {
      gameVisibility: { ...DEFAULT_GAME_VISIBILITY, "Quake 4": false },
    });
    expect(titlesByGame.map((r) => r.game)).not.toContain("Quake 4");

    const q3 = titlesByGame.find((r) => r.game === "Quake 3");
    expect(q3.titles).toBe(1);
    expect(q3.leaders.sort()).toEqual(["alpha", "bravo"]);

    // visible game with no titles → empty leaders, not a missing row
    const qw = titlesByGame.find((r) => r.game === "Quake World");
    expect(qw).toMatchObject({ leaders: [], titles: 0 });
  });
});

describe("tier-1 titles", () => {
  test("only tier-1 firsts count; total titles ride along as context", () => {
    const rows = [
      row({ Tier: 1, "1st": "alpha" }),
      row({ Tier: 2, "1st": "alpha" }),
      row({ Tier: 2, "1st": "alpha" }),
    ];
    const { tier1Titles } = run(rows);
    expect(tier1Titles[0]).toMatchObject({
      player: "alpha",
      titles: 1,
      allTitles: 3,
    });
  });

  test("hiding tier 1 empties the record", () => {
    const rows = [row({ Tier: 1, "1st": "alpha" }), row({ Tier: 2, "1st": "alpha" })];
    const { tier1Titles } = run(rows, {
      tierVisibility: { ...DEFAULT_TIER_VISIBILITY, 1: false },
    });
    expect(tier1Titles).toEqual([]);
  });
});

describe("grand-final conversion", () => {
  test("min-N guard and rate ordering", () => {
    const rows = [];
    // alpha: 8 wins + 4 losses = 12 finals, 66.7%
    for (let i = 0; i < 8; i++) rows.push(row({ Year: 2000 + i, "1st": "alpha" }));
    for (let i = 0; i < 4; i++) rows.push(row({ Year: 2000 + i, "2nd": "alpha" }));
    // charlie: 9 wins + 1 loss = 10 finals, 90% — exactly at the guard
    for (let i = 0; i < 9; i++) rows.push(row({ Year: 2000 + i, "1st": "charlie" }));
    rows.push(row({ "2nd": "charlie" }));
    // bravo: 3 finals — under the guard, perfect rate must NOT chart
    for (let i = 0; i < 3; i++) rows.push(row({ Year: 2000 + i, "1st": "bravo" }));

    const { gfConversion } = run(rows);
    expect(gfConversion.map((r) => r.player)).toEqual(["charlie", "alpha"]);
    expect(gfConversion[0]).toMatchObject({ won: 9, finals: 10 });
    expect(gfConversion[0].rate).toBeCloseTo(0.9);
    expect(gfConversion[1].rate).toBeCloseTo(8 / 12);
    expect(MIN_GRAND_FINALS).toBeGreaterThan(3);
  });

  test("undefined (null) when the 1st or 2nd bucket is hidden", () => {
    const rows = [row({ "1st": "alpha", "2nd": "bravo" })];
    expect(
      run(rows, {
        pointsVisibility: { ...DEFAULT_POINTS_VISIBILITY, second: false },
      }).gfConversion
    ).toBeNull();
    expect(
      run(rows, {
        pointsVisibility: { ...DEFAULT_POINTS_VISIBILITY, first: false },
      }).gfConversion
    ).toBeNull();
  });
});

describe("career span and events attended", () => {
  test("span is inclusive of both end years", () => {
    const rows = [
      row({ Year: 1997, "1st": "alpha" }),
      row({ Year: 2013, "2nd": "alpha" }),
      row({ Year: 2005, "1st": "bravo" }),
    ];
    const { careerSpans } = run(rows);
    expect(careerSpans[0]).toEqual({
      player: "alpha",
      years: 17,
      from: 1997,
      to: 2013,
    });
    expect(careerSpans[1]).toMatchObject({ player: "bravo", years: 1 });
  });

  test("events attended = scored participations", () => {
    const rows = [
      row({ Year: 2001, "1st": "alpha" }),
      row({ Year: 2002, "5th": "alpha" }),
      row({ Year: 2003, "3rd": "alpha" }),
      row({ Year: 2002, "1st": "bravo" }),
    ];
    const { mostEvents } = run(rows);
    expect(mostEvents[0]).toEqual({
      player: "alpha",
      events: 3,
      from: 2001,
      to: 2003,
    });
  });
});

describe("biggest prize-pool events won", () => {
  test("orders by prize, skips null prizes, applies game visibility", () => {
    const rows = [
      row({ Event_Name: "Mid", Prizepool: 100000, "1st": "alpha" }),
      row({ Event_Name: "Big", Game: "Quake 4", Prizepool: 250000, "1st": "bravo" }),
      row({ Event_Name: "Free", Prizepool: null, "1st": "charlie" }),
    ];
    const all = run(rows);
    expect(all.prizeEvents.map((e) => e.name)).toEqual(["Big", "Mid"]);
    expect(all.prizeEvents[0].prizepool).toBe(250000);

    const hidden = run(rows, {
      gameVisibility: { ...DEFAULT_GAME_VISIBILITY, "Quake 4": false },
    });
    expect(hidden.prizeEvents.map((e) => e.name)).toEqual(["Mid"]);
  });

  test("team events union their winners across merged rows", () => {
    const rows = [
      row({ Event_Name: "CTF Cup", Mode: "CTF", Year: 2004, Prizepool: 50000, "1st": "alpha" }),
      row({ Event_Name: "CTF Cup", Mode: "CTF", Year: 2004, Prizepool: 50000, "1st": "bravo" }),
    ];
    const { prizeEvents } = run(rows);
    expect(prizeEvents).toHaveLength(1);
    expect(prizeEvents[0].winners).toEqual(["alpha", "bravo"]);
  });
});

describe("LAN only", () => {
  test("flips every record to LAN-world: online titles and prizes drop", () => {
    const rows = [
      row({ LAN: true, Prizepool: 50000, "1st": "alpha" }),
      row({ LAN: false, Prizepool: 90000, Year: 2006, "1st": "alpha" }),
    ];
    const all = run(rows);
    expect(all.mostTitles[0].titles).toBe(2);
    expect(all.prizeEvents.map((e) => e.prizepool)).toEqual([90000, 50000]);

    // run() routes lanOnly to BOTH layers, like the page: computeRankings
    // (player records) and computeRecords (prize list)
    const lan = run(rows, { lanOnly: true });
    expect(lan.mostTitles[0].titles).toBe(1);
    expect(lan.prizeEvents.map((e) => e.prizepool)).toEqual([50000]);
  });
});

describe("limits", () => {
  test("every top list caps at RECORD_LIMIT", () => {
    const names = ["a", "b", "c", "d", "e", "f", "g"];
    const rows = names.map((n, i) =>
      row({ Year: 2000 + i, Prizepool: 1000 * (i + 1), "1st": n })
    );
    const out = run(rows);
    expect(out.mostTitles).toHaveLength(RECORD_LIMIT);
    expect(out.mostEvents).toHaveLength(RECORD_LIMIT);
    expect(out.careerSpans).toHaveLength(RECORD_LIMIT);
    expect(out.prizeEvents).toHaveLength(RECORD_LIMIT);
  });
});
