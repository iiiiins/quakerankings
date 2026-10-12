import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import LoadState from "../components/LoadState";

jest.mock("../services/fetchPlayersByGame", () => ({ fetchListTournamentsResult: jest.fn() }));
const { fetchListTournamentsResult } = require("../services/fetchPlayersByGame");
const { useTournamentsStatus, refreshTournaments, __resetTournamentsCache } = require("./useTournaments");

// Same pattern every page uses: spinner/error until ready, then the count.
const Probe = () => {
  const { tournaments, loading, error } = useTournamentsStatus();
  if (loading || error) return <LoadState error={error} />;
  return <div>{tournaments.length === 0 ? "No results found" : `${tournaments.length} rows`}</div>;
};

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let resolve, container, root;
const text = () => container.textContent;
const render = (el) => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root.render(el));
};
const clickText = (t) =>
  [...container.querySelectorAll("button")].find((b) => b.textContent.includes(t)).click();
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});
beforeEach(() => {
  __resetTournamentsCache();
  fetchListTournamentsResult.mockReset();
  fetchListTournamentsResult.mockImplementation(() => new Promise((r) => (resolve = r)));
});

test("shows the loader, never 'No results found', until data arrives", async () => {
  render(<Probe />);
  expect(text()).toContain("Loading rankings…");
  expect(text()).not.toContain("No results found");
  await act(async () => resolve({ data: [{ id: 1 }, { id: 2 }], error: null }));
  expect(text()).toContain("2 rows");
});

test("'No results found' only after an empty load completes", async () => {
  render(<Probe />);
  await act(async () => resolve({ data: [], error: null }));
  expect(text()).toContain("No results found");
});

test("a failed fetch shows the error with Retry; retry recovers", async () => {
  jest.spyOn(console, "error").mockImplementation(() => {});
  render(<Probe />);
  await act(async () => resolve({ data: null, error: { message: "down" } }));
  expect(container.querySelector("[role=alert]").textContent).toContain("Couldn't load tournament data");
  await act(async () => {
    clickText("Retry");
  });
  expect(text()).toContain("Loading rankings…");
  await act(async () => resolve({ data: [{ id: 1 }], error: null }));
  expect(text()).toContain("1 rows");
  console.error.mockRestore();
});

test("a refresh with data on screen doesn't flash the loader", async () => {
  render(<Probe />);
  await act(async () => resolve({ data: [{ id: 1 }], error: null }));
  act(() => {
    refreshTournaments();
  });
  expect(text()).toContain("1 rows");
  await act(async () => resolve({ data: [{ id: 1 }, { id: 2 }], error: null }));
  expect(text()).toContain("2 rows");
});
