// The v1 share-link format is a permanent public contract — these tests pin
// the grammar, the omit-at-default rule, decode leniency, and sanitization.
// A failure here means existing links in the wild would change meaning.

import {
  encodeShareState,
  decodeShareParam,
  parseShareFromHash,
  summarizeShareState,
} from "./shareCodec";
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
  DEFAULT_MIN_EVENTS_FOR_PPE,
  DEFAULT_FILTERS,
} from "./formulaDefaults";

const makeConfig = (overrides = {}) => ({
  pointsConfig: { ...DEFAULT_POINTS_CONFIG, ...overrides.pointsConfig },
  pointsVisibility: { ...DEFAULT_POINTS_VISIBILITY, ...overrides.pointsVisibility },
  gameWeights: { ...DEFAULT_GAME_WEIGHTS, ...overrides.gameWeights },
  gameVisibility: { ...DEFAULT_GAME_VISIBILITY, ...overrides.gameVisibility },
  tierWeights: { ...DEFAULT_TIER_WEIGHTS, ...overrides.tierWeights },
  tierVisibility: { ...DEFAULT_TIER_VISIBILITY, ...overrides.tierVisibility },
  modeWeights: { ...DEFAULT_MODE_WEIGHTS, ...overrides.modeWeights },
  modeVisibility: { ...DEFAULT_MODE_VISIBILITY, ...overrides.modeVisibility },
  minEventsForPpe: overrides.minEventsForPpe ?? DEFAULT_MIN_EVENTS_FOR_PPE,
});

const makeFilters = (overrides = {}) => ({
  ...DEFAULT_FILTERS,
  yearRange: [...DEFAULT_FILTERS.yearRange],
  ...overrides,
});

describe("encodeShareState", () => {
  test("pure defaults encode to bare v1", () => {
    expect(encodeShareState(makeConfig(), makeFilters())).toBe("v1");
  });

  test("each customization produces exactly its own segment", () => {
    expect(
      encodeShareState(makeConfig({ pointsConfig: { first: 150 } }), makeFilters())
    ).toBe("v1.p150-50-25-10");
    expect(
      encodeShareState(makeConfig({ pointsVisibility: { first: false, top8: false } }), makeFilters())
    ).toBe("v1.hp1-8");
    expect(
      encodeShareState(makeConfig({ tierWeights: { 2: 80 } }), makeFilters())
    ).toBe("v1.t100-80-35-20-10");
    expect(
      encodeShareState(makeConfig({ tierVisibility: { 4: false, 5: false } }), makeFilters())
    ).toBe("v1.ht4-5");
    expect(
      encodeShareState(
        makeConfig({ gameWeights: { "Quake Live": 120, "Quake Champions": 80 } }),
        makeFilters()
      )
    ).toBe("v1.gql_120-qc_80");
    expect(
      encodeShareState(makeConfig({ gameVisibility: { Diabotical: false } }), makeFilters())
    ).toBe("v1.hgdb");
    expect(
      encodeShareState(makeConfig({ modeWeights: { "2v2": 50 } }), makeFilters())
    ).toBe("v1.m2v2_50");
    expect(
      encodeShareState(makeConfig({ modeVisibility: { TDM: false, CTF: false } }), makeFilters())
    ).toBe("v1.hmtdm-ctf");
    expect(encodeShareState(makeConfig({ minEventsForPpe: 10 }), makeFilters())).toBe("v1.e10");
    expect(
      encodeShareState(makeConfig(), makeFilters({ selectedGame: "Quake 3" }))
    ).toBe("v1.fgq3");
    expect(
      encodeShareState(makeConfig(), makeFilters({ selectedMode: "Duel" }))
    ).toBe("v1.fmduel");
    expect(
      encodeShareState(makeConfig(), makeFilters({ yearRange: [2003, 2013] }))
    ).toBe("v1.y2003-2013");
    expect(encodeShareState(makeConfig(), makeFilters({ lanOnly: true }))).toBe("v1.l");
    expect(encodeShareState(makeConfig(), makeFilters({ powerRanking: true }))).toBe("v1.w");
  });

  test("kitchen sink uses canonical segment order", () => {
    const config = makeConfig({
      pointsConfig: { first: 150, second: 75, top4: 30, top8: 5 },
      pointsVisibility: { top8: false },
      gameWeights: { "Quake Live": 120, "Quake Champions": 80 },
      gameVisibility: { Diabotical: false },
      tierWeights: { 2: 80, 3: 50, 4: 25 },
      tierVisibility: { 4: false, 5: false },
      modeWeights: { "2v2": 50 },
      modeVisibility: { SAC: false, WIP: false, DBT: false },
      minEventsForPpe: 10,
    });
    const filters = makeFilters({
      selectedGame: "Quake 3",
      selectedMode: "Duel",
      yearRange: [2003, 2013],
      lanOnly: true,
      powerRanking: true,
    });
    expect(encodeShareState(config, filters)).toBe(
      "v1.p150-75-30-5.hp8.t100-80-50-25-10.ht4-5.gql_120-qc_80.hgdb.m2v2_50.hmsac-wip-dbt.e10.fgq3.fmduel.y2003-2013.l.w"
    );
  });

  test("a current-year-capped default range is omitted", () => {
    expect(
      encodeShareState(makeConfig(), makeFilters({ yearRange: [YEAR_MIN, CURRENT_YEAR] }))
    ).toBe("v1");
  });
});

describe("decodeShareParam", () => {
  test("bare v1 decodes to complete defaults", () => {
    expect(decodeShareParam("v1")).toEqual({
      config: makeConfig(),
      filters: makeFilters(),
    });
  });

  test("non-v1 input is rejected", () => {
    expect(decodeShareParam("")).toBeNull();
    expect(decodeShareParam("v2.l")).toBeNull();
    expect(decodeShareParam("garbage")).toBeNull();
    expect(decodeShareParam(null)).toBeNull();
    expect(decodeShareParam(undefined)).toBeNull();
  });

  test("kitchen sink round-trips exactly", () => {
    const config = makeConfig({
      pointsConfig: { first: 150, second: 75, top4: 30, top8: 5 },
      pointsVisibility: { top8: false },
      gameWeights: { "Quake Live": 120, "Quake Champions": 80 },
      gameVisibility: { Diabotical: false },
      tierWeights: { 2: 80, 3: 50, 4: 25 },
      tierVisibility: { 4: false, 5: false },
      modeWeights: { "2v2": 50 },
      modeVisibility: { SAC: false, WIP: false, DBT: false },
      minEventsForPpe: 10,
    });
    const filters = makeFilters({
      selectedGame: "Quake 3",
      selectedMode: "Duel",
      yearRange: [2003, 2013],
      lanOnly: true,
      powerRanking: true,
    });
    expect(decodeShareParam(encodeShareState(config, filters))).toEqual({ config, filters });
  });

  test("explicit defaults canonicalize back to bare v1", () => {
    const decoded = decodeShareParam("v1.p100-50-25-10.t100-60-35-20-10.y1996-" + CURRENT_YEAR);
    expect(encodeShareState(decoded.config, decoded.filters)).toBe("v1");
  });

  test("unknown segments and codes are skipped, the rest applies", () => {
    const decoded = decodeShareParam("v1.zz99.y2003-2013.hgxx-db.qqq");
    expect(decoded.filters.yearRange).toEqual([2003, 2013]);
    expect(decoded.config.gameVisibility).toEqual({
      ...DEFAULT_GAME_VISIBILITY,
      Diabotical: false,
    });
  });

  test("malformed segments fall back to defaults", () => {
    const decoded = decodeShareParam("v1.p100-50.t1-2-3.gql_abc.mduel.y2005.eNaN");
    expect(decoded.config.pointsConfig).toEqual(DEFAULT_POINTS_CONFIG);
    expect(decoded.config.tierWeights).toEqual(DEFAULT_TIER_WEIGHTS);
    expect(decoded.config.gameWeights).toEqual(DEFAULT_GAME_WEIGHTS);
    expect(decoded.config.modeWeights).toEqual(DEFAULT_MODE_WEIGHTS);
    expect(decoded.filters.yearRange).toEqual([YEAR_MIN, CURRENT_YEAR]);
    expect(decoded.config.minEventsForPpe).toBe(DEFAULT_MIN_EVENTS_FOR_PPE);
  });

  test("years clamp into range and swap when reversed", () => {
    expect(decodeShareParam("v1.y1980-2099").filters.yearRange).toEqual([
      YEAR_MIN,
      CURRENT_YEAR,
    ]);
    expect(decodeShareParam("v1.y2013-2003").filters.yearRange).toEqual([2003, 2013]);
  });

  test("weights sanitize to non-negative integers", () => {
    expect(decodeShareParam("v1.e-5").config.minEventsForPpe).toBe(0);
    expect(decodeShareParam("v1.gql_999999").config.gameWeights["Quake Live"]).toBe(100000);
  });
});

describe("parseShareFromHash", () => {
  test("extracts f from a HashRouter location hash", () => {
    expect(parseShareFromHash("#/?f=v1.l").filters.lanOnly).toBe(true);
  });

  test("returns null without a query or f param", () => {
    expect(parseShareFromHash("#/")).toBeNull();
    expect(parseShareFromHash("")).toBeNull();
    expect(parseShareFromHash(undefined)).toBeNull();
    expect(parseShareFromHash("#/?x=1")).toBeNull();
    expect(parseShareFromHash("#/?f=v2.l")).toBeNull();
  });

  test("survives percent-encoding", () => {
    expect(parseShareFromHash("#/?f=v1%2El").filters.lanOnly).toBe(true);
  });
});

describe("summarizeShareState", () => {
  test("defaults summarize as a single chip", () => {
    expect(summarizeShareState(makeConfig(), makeFilters())).toEqual(["Default formula"]);
  });

  test("the walkthrough-mock state produces the mock chips", () => {
    const { config, filters } = decodeShareParam("v1.ht4-5.fmduel.y2003-2013.l");
    expect(summarizeShareState(config, filters)).toEqual([
      "Years 2003–2013",
      "LAN only",
      "Duel only",
      "Tiers 1–3",
    ]);
  });

  test("tier lists render as runs", () => {
    const { config, filters } = decodeShareParam("v1.ht4");
    expect(summarizeShareState(config, filters)).toEqual(["Tiers 1–3, 5"]);
  });

  test("weights and hidden sets summarize honestly", () => {
    const config = makeConfig({
      pointsConfig: { first: 150 },
      gameWeights: { "Quake Live": 120 },
      gameVisibility: { Diabotical: false },
      modeWeights: { TDM: 50 },
      modeVisibility: { SAC: false, WIP: false },
      minEventsForPpe: 10,
    });
    expect(summarizeShareState(config, makeFilters({ powerRanking: true }))).toEqual([
      "Power Ranking",
      "Points 150/50/25/10",
      "Quake Live 120%",
      "Without Diabotical",
      "TDM 50%",
      "Without SAC, WIP",
      "PPE min 10",
    ]);
  });
});
