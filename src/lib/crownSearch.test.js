import { prepare, findCrown, verifyCrown, shareParam, setupToState, scoresFor } from "./crownSearch";
import computeRankings from "./computeRankings";

let id = 1;
const row = (year, game, mode, tier, lan, places) => {
  const r = { id: id++, Event_Name: `E${id}`, Year: year, Game: game, Mode: mode, Tier: tier, LAN: lan };
  places.forEach((p, i) => (r[["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th"][i]] = p));
  return r;
};

// "boss" dominates. "oldie" only shines in 2001, "ctfguy" only in CTF,
// "bridesmaid" is 2nd everywhere, "third" collects 3rd places,
// "twin-a"/"twin-b" tie on everything, "WOLF" is stored with capitals.
const rows = [
  row(2001, "Quake 3", "Duel", 2, true, ["oldie", "boss", "bridesmaid", "third"]),
  row(2005, "Quake 3", "Duel", 1, true, ["boss", "bridesmaid", "third", "twin-a"]),
  row(2006, "Quake 3", "Duel", 1, false, ["boss", "bridesmaid", "third", "twin-b"]),
  row(2007, "Quake 3", "Duel", 1, false, ["boss", "bridesmaid", "third"]),
  row(2008, "Quake 3", "CTF", 4, false, ["ctfguy", "WOLF"]),
  row(2009, "Quake Live", "Duel", 1, true, ["boss", "bridesmaid", "third"]),
];
const prep = prepare(rows);

const crown = (name, opts) => findCrown(prep, name, opts);
const linkOf = (name, opts) => {
  const { setup } = crown(name, opts);
  return setup && shareParam(setup);
};

test("the default #1 needs no changes", () => {
  expect(linkOf("boss")).toBe("v1");
});

test("filters come before weights, and the simplest filter wins", () => {
  expect(linkOf("ctfguy")).toBe("v1.fmctf");
  expect(linkOf("oldie")).toBe("v1.y2001-2001");
});

// The search scores players with its own fast arithmetic. For mixed weights in
// every family, that arithmetic must match the site's real ranking exactly.
test("the search's points equal computeRankings for mixed weights in every family", () => {
  const all = { g: -1, m: -1, from: 1996, to: 2030, lan: false, power: false };
  const cases = [
    { filter: all, family: "points", weights: [10, 40, 70, 5] },
    { filter: all, family: "tiers", weights: [100, 30, 0, 80, 10] },
    { filter: all, family: "games", weights: [0, 0, 150, 0, 40, 0, 0] },
    { filter: all, family: "modes", weights: [60, 0, 0, 25, 0, 0, 0, 0] },
    { filter: { ...all, from: 2005, to: 2009, lan: true }, family: "points", weights: [1, 90, 3, 7] },
  ];
  cases.forEach((setup) => {
    const { config, filters } = setupToState(setup);
    const real = computeRankings(rows, { ...config, ...filters }).players;
    const mine = scoresFor(prep, setup);
    real.forEach((p) => expect(Math.round(mine.get(p.player))).toBe(p.points));
  });
});

test("a placement-points answer opens as a real #1", () => {
  const { setup } = crown("bridesmaid");
  expect(setup.family).toBe("points");
  expect(verifyCrown(rows, "bridesmaid", setup).ok).toBe(true);
  const third = crown("third");
  expect(verifyCrown(rows, "third", third.setup).ok).toBe(true);
});

test("every answer found here is #1 when its share link is opened", () => {
  ["boss", "oldie", "ctfguy", "bridesmaid", "third", "WOLF"].forEach((n) => {
    const { setup } = crown(n);
    if (setup) expect(verifyCrown(rows, n, setup)).toMatchObject({ ok: true });
  });
});

test("a tie is not a crown, and a miss reports what was searched", () => {
  const r = crown("twin-a");
  expect(r.setup).toBeNull();
  expect(r.searched.cells).toBeGreaterThan(0);
  expect(r.searched.families).toEqual(["points", "tiers", "games", "modes"]);
});

test("strict keeps every game, mode and year counting", () => {
  const { setup } = crown("ctfguy", { strict: true });
  const link = shareParam(setup);
  expect(link).not.toMatch(/\.f[gm]|\.y|\.l|_0\b|-0\b|p0|\.t0/);
  expect(verifyCrown(rows, "ctfguy", setup).ok).toBe(true);
});

test("names keep their stored capitals, with a lowercase fallback", () => {
  expect(crown("WOLF").setup).not.toBeNull();
  expect(crown("wolf").setup).not.toBeNull();
});
