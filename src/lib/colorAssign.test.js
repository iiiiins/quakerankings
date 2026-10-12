import { assignColors, deltaE, contrast, BG } from "./colorAssign";
import { PALETTE, CONTENDER_PALETTE } from "../components/WhoWasOnePage";

const MIN_DE = 20; // clearly distinguishable

const usualFor = (leaders, chasers) => {
  const u = {};
  leaders.forEach((n, i) => (u[n] = PALETTE[i]));
  chasers.forEach((n, i) => (u[n] = CONTENDER_PALETTE[i]));
  return u;
};
const leaders = ["thresh", "fatal1ty", "zero4", "toxjq", "cooller", "cypher", "rapha"];
const chasers = ["av3k", "evil", "fox", "dahang", "stelam"];
const usual = usualFor(leaders, chasers);

// Every pair involving at least one non-default player must be distinct.
const checkDistinct = (sel, colors) => {
  sel.forEach((a, i) =>
    sel.slice(i + 1).forEach((b) => {
      if (usual[a] && usual[b]) return; // both keep their historic colours
      expect([a, b, deltaE(colors[a], colors[b])]).toEqual([a, b, expect.any(Number)]);
      expect(deltaE(colors[a], colors[b])).toBeGreaterThanOrEqual(MIN_DE);
    })
  );
};

test("reported set (ins/phaze/serious/enesy/vengeur) gets 5 distinct colours", () => {
  const sel = ["ins", "phaze", "serious", "enesy", "vengeur"];
  const c = assignColors(sel, usual);
  expect(new Set(Object.values(c)).size).toBe(5);
  checkDistinct(sel, c);
});

test("14 custom players, no defaults: all distinct and readable", () => {
  const sel = Array.from({ length: 14 }, (_, i) => `p${i}`);
  const c = assignColors(sel, usual);
  checkDistinct(sel, c);
  Object.values(c).forEach((hex) => expect(contrast(hex, BG)).toBeGreaterThanOrEqual(4.5));
});

test("defaults keep their usual colour; added players avoid them", () => {
  const sel = [...leaders, ...chasers, "serious", "ins"];
  const c = assignColors(sel, usual);
  leaders.forEach((n, i) => expect(c[n]).toBe(PALETTE[i]));
  checkDistinct(sel, c);
});

test("a removed default frees its colour for others", () => {
  const sel = ["rapha", "x"];
  const c = assignColors(sel, usual);
  expect(c.rapha).toBe(usual.rapha);
  expect(c.x).not.toBe(c.rapha);
  checkDistinct(sel, c);
});
