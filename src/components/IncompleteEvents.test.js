// Pins the admin panel that surfaces half-finished tournament rows. The rule it
// must obey: the rows it lists are exactly the rows computeRankings refuses to
// score. If those two ever disagree, the board silently drops events that this
// page swears are fine — which is the whole problem it exists to solve.

import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import IncompleteEvents from "./IncompleteEvents";
import useTournaments from "../hooks/useTournaments";
import computeRankings, { missingFields } from "../lib/computeRankings";
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
} from "../lib/formulaDefaults";

jest.mock("../hooks/useTournaments");

// react-router-dom 7 is ESM-only with an exports map CRA's jest resolver cannot
// follow, though webpack builds it fine. Only <Link> is needed here, so it is
// stubbed as a plain anchor — and it has to be `virtual` because jest resolves the
// real path before reaching the factory, which is the same error either way.
// Any future component test that touches routing will need this block.
jest.mock(
  "react-router-dom",
  () => ({ Link: ({ to, children }) => <a href={to}>{children}</a> }),
  { virtual: true }
);

let id = 0;
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

let container = null;
let root = null;

beforeEach(() => {
  id = 0;
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  root = null;
  container = null;
  jest.restoreAllMocks();
});

const render = () =>
  act(() => {
    root.render(
<IncompleteEvents />
    );
  });

const items = () =>
  Array.from(container.querySelectorAll(".incomplete-list li")).map((n) =>
    n.textContent.replace(/\s+/g, " ").trim()
  );
const heading = () => container.querySelector(".game-section-title")?.textContent;

test("a clean table renders nothing at all", () => {
  // Not an empty panel — no panel. A permanent "0 to fix" box trains you to
  // ignore the region it lives in.
  useTournaments.mockReturnValue([row(), row()]);
  render();
  expect(container.querySelector(".game-section")).toBeNull();
  expect(items()).toEqual([]);
});

test("it names the event, the year and every field that is missing", () => {
  useTournaments.mockReturnValue([
    row({ Event_Name: "QuakeCon", Tier: null }),
    row(),
  ]);
  render();
  expect(items()).toEqual(["QuakeCon (2005) — missing Tier"]);
});

test("it lists several missing fields together", () => {
  useTournaments.mockReturnValue([row({ Event_Name: "Dreamhack", Tier: null, Year: null })]);
  render();
  expect(items()).toEqual(["Dreamhack — missing Tier, Year"]);
});

test("the heading counts the broken rows, not the total", () => {
  useTournaments.mockReturnValue([row(), row({ Tier: null }), row({ Game: null }), row()]);
  render();
  expect(heading()).toBe("Needs fixing (2)");
  expect(items()).toHaveLength(2);
});

test("a row with no name falls back to its id rather than rendering blank", () => {
  useTournaments.mockReturnValue([row({ Event_Name: "", Year: null })]);
  render();
  expect(items()).toEqual(["Event #1 — missing Year"]);
});

test("the rows it lists are exactly the rows the scoring drops", () => {
  // The contract. Both sides read missingFields, so this cannot drift — but if
  // someone reimplements the check in either place, this is what goes red.
  const spy = jest.spyOn(console, "error").mockImplementation(() => {});
  const rows = [row(), row({ Tier: null }), row({ Mode: null }), row()];
  useTournaments.mockReturnValue(rows);
  render();

  const { filteredCount, totalTournaments } = computeRankings(rows, {
    selectedGame: "All",
    selectedMode: "All",
    yearRange: [YEAR_MIN, 2030],
    lanOnly: false,
    powerRanking: false,
    pointsConfig: DEFAULT_POINTS_CONFIG,
    pointsVisibility: DEFAULT_POINTS_VISIBILITY,
    gameWeights: DEFAULT_GAME_WEIGHTS,
    gameVisibility: DEFAULT_GAME_VISIBILITY,
    tierWeights: DEFAULT_TIER_WEIGHTS,
    tierVisibility: DEFAULT_TIER_VISIBILITY,
    modeWeights: DEFAULT_MODE_WEIGHTS,
    modeVisibility: DEFAULT_MODE_VISIBILITY,
  });

  expect(items()).toHaveLength(2);
  expect(filteredCount).toBe(2);
  expect(totalTournaments - filteredCount).toBe(2); // and the board's tally adds up
  expect(rows.filter((r) => missingFields(r).length)).toHaveLength(items().length);
  spy.mockRestore();
});
