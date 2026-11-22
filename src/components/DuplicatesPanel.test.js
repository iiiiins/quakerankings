// The admin Duplicates section writes to the live table, so two rules are
// pinned with a fake writer (never the real database):
//   1. Dry run never calls the real write.
//   2. A confirmed merge sends exactly the planned row patches, only after
//      the preview, and refreshes the data afterwards.

import "@testing-library/jest-dom";
import { act } from "react";
import { createRoot } from "react-dom/client";
import DuplicatesPanel from "./DuplicatesPanel";
import useTournaments, { refreshTournaments } from "../hooks/useTournaments";
import { updateTournament } from "../services/tournamentWrites";

jest.mock("../hooks/useTournaments", () => ({
  __esModule: true,
  default: jest.fn(),
  refreshTournaments: jest.fn(),
}));
jest.mock("../services/tournamentWrites", () => ({
  __esModule: true,
  updateTournament: jest.fn(async () => ({})),
}));

global.IS_REACT_ACT_ENVIRONMENT = true;

let id = 0;
const row = (event, places) => {
  id += 1;
  const r = { id, Event_Name: event, Year: 2018, Game: "Quake Champions", Mode: "Duel", Tier: 3, LAN: false };
  places.forEach((p, i) => (r[["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th"][i]] = p));
  return r;
};
const crowd = ["r1", "r2", "r3", "r4", "r5", "r6"];
const ROWS = [
  row("Cup 1", ["busdriver", ...crowd]),
  row("Cup 2", ["busdriverx", ...crowd]),
  row("Cup 3", ["busdriver", "r1"]),
  row("Cup 4", ["r2", "busdriverx"]),
];

let container;
let root;
beforeEach(() => {
  useTournaments.mockReturnValue(ROWS);
  updateTournament.mockClear();
  refreshTournaments.mockClear();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

const render = (props) => act(async () => root.render(<DuplicatesPanel {...props} />));
const button = (text) =>
  [...container.querySelectorAll("button")].find((b) => b.textContent.trim().startsWith(text));
const click = (el) =>
  act(async () => el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true })));

test("the strong pair shows first with its evidence", async () => {
  await render({});
  const first = container.querySelector(".dup-item");
  expect(first).toHaveTextContent("STRONG");
  expect(first).toHaveTextContent("busdriver / busdriverx");
  expect(first).toHaveTextContent("6 shared rivals");
});

test("a merge previews every row before anything is written, then writes those rows", async () => {
  await render({});
  await click(button("Merge"));
  // default keeps the name with more events (busdriver, 2 vs 2: a wins ties)
  const preview = container.querySelector(".dup-preview");
  expect(preview).toHaveTextContent("2 rows change");
  expect(preview).toHaveTextContent("#2");
  expect(preview).toHaveTextContent("#4");
  expect(updateTournament).not.toHaveBeenCalled();

  await click(button("Confirm"));
  expect(updateTournament.mock.calls).toEqual([
    [2, { "1st": "busdriver" }],
    [4, { "2nd": "busdriver" }],
  ]);
  expect(refreshTournaments).toHaveBeenCalled();
  expect(container).toHaveTextContent("busdriverx merged into busdriver: 2 rows");
});

test("dry run shows the same plan and never calls the real write", async () => {
  await render({ dryRun: true });
  await click(button("Merge"));
  await click(button("Dry run"));
  expect(updateTournament).not.toHaveBeenCalled();
  expect(refreshTournaments).not.toHaveBeenCalled();
  expect(container).toHaveTextContent("dry run, nothing written");
});

test("a rejected write stops the merge and says how far it got", async () => {
  updateTournament.mockImplementationOnce(async () => ({ error: { message: "No row was updated" } }));
  await render({});
  await click(button("Merge"));
  await click(button("Confirm"));
  expect(updateTournament).toHaveBeenCalledTimes(1);
  expect(container).toHaveTextContent("Stopped at row #2: No row was updated");
});
