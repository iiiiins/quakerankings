import { resolveSelection, addPlayer, removePlayer, togglePlayer, searchPlayers } from "./chartSelection";

const defaults = ["a", "b"];

test("null selection follows the defaults", () => {
  expect(resolveSelection(null, defaults)).toBe(defaults);
  expect(resolveSelection(["x"], defaults)).toEqual(["x"]);
});

test("add / remove / toggle start from the defaults and never duplicate", () => {
  expect(addPlayer(null, defaults, "c")).toEqual(["a", "b", "c"]);
  expect(addPlayer(null, defaults, "a")).toEqual(["a", "b"]);
  expect(removePlayer(null, defaults, "a")).toEqual(["b"]);
  expect(togglePlayer(["b"], defaults, "b")).toEqual([]);
  expect(togglePlayer([], defaults, "z")).toEqual(["z"]);
});

test("searchPlayers matches substrings, skips selected, caps results", () => {
  const board = ["rapha", "cypher", "raisy", "craftyy"].map((player, i) => ({ player, rank: i + 1, points: 1 }));
  expect(searchPlayers(board, "RA", ["rapha"]).map((p) => p.player)).toEqual(["raisy", "craftyy"]);
  expect(searchPlayers(board, "  ", [])).toEqual([]);
  expect(searchPlayers(board, "a", [], 2)).toHaveLength(2);
});
