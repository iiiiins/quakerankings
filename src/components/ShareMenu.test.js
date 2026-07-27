// The share popover is the only place the v1 link, the canonical chips and the
// top-10 card are assembled from live board state. Two rules are pinned here:
//
//   1. Everything the popover shows comes from the CANONICAL state — encode,
//      then decode — so the chips and the card describe exactly the board a
//      link opener will get, never the sharer's un-encodable local view.
//   2. The card's numbers (the ranked players and the counts line) never reach
//      the DOM — they are drawn on a canvas — so they are asserted through the
//      renderShareCard spy. That spy is the ONLY contract check the card
//      renderer has.
//
// A failure here means a shared link and the picture beside it disagree, or
// that a link ships a board nobody else can open.
//
// Rendering is done with React's own act + createRoot rather than
// @testing-library/react: RTL 16 is installed but its peer
// @testing-library/dom is not, so importing it fails to resolve.

import "@testing-library/jest-dom"; // no src/setupTests.js in this repo
import { act } from "react";
import { createRoot } from "react-dom/client";
import ShareMenu from "./ShareMenu";
import useTournaments from "../hooks/useTournaments";
import renderShareCard from "../lib/renderShareCard";
import {
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
} from "../lib/formulaDefaults";

// useTournaments would hit Supabase over the network and keeps a module-level
// cache that leaks between tests; renderShareCard needs a real 2d canvas
// context, which jsdom does not have.
jest.mock("../hooks/useTournaments", () => ({ __esModule: true, default: jest.fn() }));
jest.mock("../lib/renderShareCard", () => ({ __esModule: true, default: jest.fn() }));

global.IS_REACT_ACT_ENVIRONMENT = true;

// ------------------------------------------------------------------ fixtures

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

// Three players whose points order, Pts/Event DESCENDING order and Pts/Event
// ASCENDING order are all different — the only fixture shape that can tell
// which sort the card was actually built with:
//   points desc   alpha 200 · bravo 80 · charlie 60
//   ppe    desc   alpha 100 · charlie 60 · bravo 10
//   ppe    asc    bravo · charlie · alpha
const sortFixture = () => [
  row({ Tier: 1, "1st": "alpha" }),
  row({ Tier: 1, "1st": "alpha" }),
  ...Array.from({ length: 8 }, () => row({ Tier: 5, "1st": "bravo" })),
  row({ Tier: 2, "1st": "charlie" }),
];
// Pts/Event only exists past the min-events threshold; 1 makes it exist here.
const sortConfig = () => makeConfig({ minEventsForPpe: 1 });

// 4 rows, 1 dropped by the LAN filter, 2 distinct players — so players (2),
// scored (3), total (4), filtered (1) and total+filtered (5) are five
// different numbers and no arithmetic mutation can hide inside a zero.
const countsFixture = () => [
  row({ "1st": "alpha", LAN: true }),
  row({ "1st": "bravo", LAN: true }),
  row({ "1st": "alpha", LAN: true }),
  row({ "1st": "charlie", LAN: false }),
];

const linkFor = (param) => `http://localhost/#/?f=${param}`;

const deferred = () => {
  let resolve;
  const promise = new Promise((r) => {
    resolve = r;
  });
  return { promise, resolve };
};

const makeCanvas = (dataUrl) => ({
  toDataURL: jest.fn(() => dataUrl),
  toBlob: jest.fn((cb) => cb(new Blob(["png"], { type: "image/png" }))),
});

const cardArgs = () => renderShareCard.mock.calls[0][0];

// ------------------------------------------------------------------- harness

let container = null;
let root = null;
let canvas;
let anchorClicks;

// resetMocks is on (react-scripts sets it), so every implementation has to be
// installed here — a jest.fn built inside a jest.mock factory is stripped bare
// before each test, and this hook runs after that reset.
beforeEach(() => {
  id = 0;
  anchorClicks = [];
  useTournaments.mockReturnValue([]);
  canvas = makeCanvas("data:image/png;base64,CARD");
  renderShareCard.mockResolvedValue(canvas);

  // Absent from jsdom 16.7 — handleDownload throws without them.
  URL.createObjectURL = jest.fn(() => "blob:http://localhost/card-1");
  URL.revokeObjectURL = jest.fn();

  // A real <a>.click() schedules a jsdom navigation that logs after the test.
  // `function` (not an arrow) so `this` is the anchor being clicked.
  jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function () {
    anchorClicks.push({ href: this.href, download: this.download });
  });

  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => {
    root.unmount();
  });
  container.remove();
  root = null;
  container = null;
  jest.restoreAllMocks();
  delete navigator.clipboard;
  delete window.ClipboardItem;
});

const renderMenu = async (props) => {
  await act(async () => {
    root.render(<ShareMenu {...props} />);
  });
};

// Flush pending promises (the card render) and the state updates they queue.
const settle = () => act(async () => {});

const click = async (el) => {
  await act(async () => {
    el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  });
};

const stubClipboard = (impl = {}) => {
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    writable: true,
    value: {
      writeText: jest.fn().mockResolvedValue(undefined),
      write: jest.fn().mockResolvedValue(undefined),
      ...impl,
    },
  });
};

// ------------------------------------------------------------------- queries

const shareInput = () => container.querySelector('input[aria-label="Share link"]');
const chipTexts = () =>
  Array.from(container.querySelectorAll(".f-chip")).map((n) => n.textContent);
const notes = () =>
  Array.from(container.querySelectorAll("p.share-note")).map((n) =>
    n.textContent.replace(/\s+/g, " ").trim()
  );
const button = (label) =>
  Array.from(container.querySelectorAll("button")).find(
    (b) => b.textContent.trim() === label
  ) || null;
const loadingBox = () => container.querySelector(".share-card-loading");
const preview = () => container.querySelector('img[alt="Top-10 share card preview"]');

// ------------------------------------------------------------- the share link

describe("the share link", () => {
  // The site is served from a subpath: package.json homepage is
  // https://iiiiins.github.io/quakerankings, so window.location.pathname is
  // "/quakerankings/" in production and "/" under jsdom. Every other test in this
  // file therefore renders at the root, where a hardcoded "/" and the real
  // pathname produce byte-identical links. Rewriting ShareMenu.js:28 to
  // `${window.location.origin}/#/?f=` would pass all of them and break every link
  // shared from the live site. This is the one test that renders elsewhere.
  test("the link carries the app's base path, not a hardcoded root", async () => {
    const original = window.location.pathname;
    window.history.pushState({}, "", "/quakerankings/");
    try {
      useTournaments.mockReturnValue(countsFixture());
      await renderMenu({ config: makeConfig(), filters: makeFilters() });

      expect(shareInput()).toHaveValue("http://localhost/quakerankings/#/?f=v1");
    } finally {
      window.history.pushState({}, "", original);
    }
  });

  test("a default board produces the bare v1 link and the default-formula chip", async () => {
    useTournaments.mockReturnValue(countsFixture());
    await renderMenu({ config: makeConfig(), filters: makeFilters() });

    expect(shareInput()).toHaveValue(linkFor("v1"));
    expect(shareInput()).toHaveAttribute("readonly");
    expect(chipTexts()).toEqual(["Default formula"]);
    expect(notes()).toContain(
      "The whole formula — points, weights, filters — lives in this link. Nothing is stored on a server."
    );
  });

  test("every customization travels in the fragment and shows as a chip", async () => {
    useTournaments.mockReturnValue(countsFixture());
    await renderMenu({
      config: makeConfig(),
      filters: makeFilters({ lanOnly: true, yearRange: [2003, 2013] }),
    });

    expect(shareInput()).toHaveValue(linkFor("v1.y2003-2013.l"));
    expect(chipTexts()).toEqual(["Years 2003–2013", "LAN only"]);
  });

  test("the chips and the card show the DECODED state, not the local one", async () => {
    // The codec clamps a year to 1996 on the way back in, so a board sitting on
    // 1990 encodes one range and decodes another. Everything the popover shows
    // has to follow the decoded one — that is what a link opener will get.
    useTournaments.mockReturnValue([
      row({ "1st": "alpha" }),
      row({ Year: 1993, "1st": "ghost" }),
    ]);
    await renderMenu({
      config: makeConfig(),
      filters: makeFilters({ yearRange: [1990, 2013] }),
    });

    expect(shareInput()).toHaveValue(linkFor("v1.y1990-2013"));
    expect(chipTexts()).toEqual(["Years 1996–2013"]);
    // ghost's 1993 event is outside the decoded range, so it is filtered and
    // ghost scores nothing — with the local range he would be on the card.
    expect(cardArgs().players.map((p) => p.player)).toEqual(["alpha"]);
    expect(cardArgs().countsLine).toBe("1 players · 1 tournaments scored");
  });

  test("a sort the link cannot carry is canonicalized away everywhere", async () => {
    // Sorting by 2nd place is view-local — it has no share segment. The chips,
    // the link and the card must all fall back to the points order rather than
    // advertise a board the link cannot reproduce.
    useTournaments.mockReturnValue(sortFixture());
    await renderMenu({
      config: sortConfig(),
      filters: makeFilters({ sortBy: "2nd", sortOrder: "desc" }),
    });

    expect(shareInput()).toHaveValue(linkFor("v1.e1"));
    expect(chipTexts()).toEqual(["PPE min 1"]);
    expect(cardArgs().sortBy).toBe("Points");
    expect(cardArgs().players.map((p) => p.player)).toEqual(["alpha", "bravo", "charlie"]);
  });
});

// ----------------------------------------------------------- copying the link

describe("copying the link", () => {
  test("a successful clipboard write copies the link and confirms on the button", async () => {
    stubClipboard();
    useTournaments.mockReturnValue(countsFixture());
    await renderMenu({ config: makeConfig(), filters: makeFilters({ lanOnly: true }) });

    await click(button("Copy"));

    expect(button("Copied ✓")).not.toBeNull();
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(linkFor("v1.l"));
    expect(notes()).not.toContain("Copy blocked by the browser — press Ctrl+C.");
  });

  test("no clipboard API selects the input so Ctrl+C still works", async () => {
    // jsdom has no navigator.clipboard — that is the blocked-browser case.
    const select = jest
      .spyOn(HTMLInputElement.prototype, "select")
      .mockImplementation(() => {});
    useTournaments.mockReturnValue(countsFixture());
    await renderMenu({ config: makeConfig(), filters: makeFilters() });

    await click(button("Copy"));

    expect(select).toHaveBeenCalledTimes(1);
    expect(notes()).toContain("Copy blocked by the browser — press Ctrl+C.");
    expect(button("Copy")).not.toBeNull();
    expect(button("Copied ✓")).toBeNull();
  });

  test("the manual-copy note clears after 2s, not before", async () => {
    // The timer sits outside the try/catch on purpose — moving it inside would
    // strand this note on screen forever.
    jest.useFakeTimers();
    try {
      jest.spyOn(HTMLInputElement.prototype, "select").mockImplementation(() => {});
      useTournaments.mockReturnValue(countsFixture());
      await renderMenu({ config: makeConfig(), filters: makeFilters() });

      await click(button("Copy"));
      expect(notes()).toContain("Copy blocked by the browser — press Ctrl+C.");

      await act(async () => {
        jest.advanceTimersByTime(1999);
      });
      expect(notes()).toContain("Copy blocked by the browser — press Ctrl+C.");

      await act(async () => {
        jest.advanceTimersByTime(1);
      });
      expect(notes()).not.toContain("Copy blocked by the browser — press Ctrl+C.");
    } finally {
      jest.useRealTimers();
    }
  });

  test("the copied confirmation reverts to Copy after 2s, not before", async () => {
    jest.useFakeTimers();
    try {
      stubClipboard();
      useTournaments.mockReturnValue(countsFixture());
      await renderMenu({ config: makeConfig(), filters: makeFilters() });

      await click(button("Copy"));
      expect(button("Copied ✓")).not.toBeNull();

      await act(async () => {
        jest.advanceTimersByTime(1999);
      });
      expect(button("Copied ✓")).not.toBeNull();

      await act(async () => {
        jest.advanceTimersByTime(1);
      });
      expect(button("Copied ✓")).toBeNull();
      expect(button("Copy")).not.toBeNull();
    } finally {
      jest.useRealTimers();
    }
  });
});

// --------------------------------------------------------- the top-10 card

describe("the top-10 card", () => {
  test("the preview shows a placeholder, then the canvas it rendered", async () => {
    const pending = deferred();
    renderShareCard.mockReturnValue(pending.promise);
    useTournaments.mockReturnValue(countsFixture());
    await renderMenu({ config: makeConfig(), filters: makeFilters() });

    expect(loadingBox()).toHaveTextContent("Rendering…");
    expect(preview()).toBeNull();
    // cardBlob() never settles while the canvas ref is null, so a click before
    // the render lands would hang forever — the disabled guard is what stops it.
    expect(button("Download PNG")).toBeDisabled();
    expect(button("Copy image")).toBeDisabled();

    await act(async () => {
      pending.resolve(makeCanvas("data:image/png;base64,LATE"));
    });

    expect(loadingBox()).toBeNull();
    expect(preview()).toHaveAttribute("src", "data:image/png;base64,LATE");
    expect(button("Download PNG")).toBeEnabled();
    expect(button("Copy image")).toBeEnabled();
  });

  test("the counts line subtracts the filtered rows from the total", async () => {
    // 4 rows, 1 dropped by lanOnly, 2 players. Every candidate mutation lands
    // on a different number: 4-1=3 (correct), 4+1=5, 4 (total), 1 (filtered),
    // 2 (players).
    useTournaments.mockReturnValue(countsFixture());
    await renderMenu({ config: makeConfig(), filters: makeFilters({ lanOnly: true }) });

    expect(renderShareCard).toHaveBeenCalledTimes(1);
    expect(cardArgs().countsLine).toBe("2 players · 3 tournaments scored");
    expect(cardArgs().players.map((p) => p.player)).toEqual(["alpha", "bravo"]);
    expect(cardArgs().chips).toEqual(chipTexts());
    expect(cardArgs().sortBy).toBe("Points");
  });

  test("the counts line uses en-US thousands separators", async () => {
    const rows = [
      ...Array.from({ length: 1200 }, (_, i) =>
        row({ "1st": `p${String(i + 1).padStart(4, "0")}`, LAN: true })
      ),
      ...Array.from({ length: 34 }, () => row({ "1st": "p0001", LAN: true })),
      ...Array.from({ length: 30 }, () => row({ "1st": "ghost", LAN: false })),
    ];
    useTournaments.mockReturnValue(rows);
    await renderMenu({ config: makeConfig(), filters: makeFilters({ lanOnly: true }) });

    // 1200 distinct players; 1264 rows total, 30 filtered => 1234 scored.
    expect(cardArgs().countsLine).toBe("1,200 players · 1,234 tournaments scored");
  });

  test("a row dropped as invalid is not counted as scored", async () => {
    // Flag 276bbc, now fixed. This test previously pinned the overstatement —
    // an incomplete row was dropped without incrementing filteredCount, so the
    // card claimed one more tournament than it had scored. It now asserts the
    // corrected figure, which is what made it go red when the fix landed.
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    useTournaments.mockReturnValue([
      row({ "1st": "alpha" }),
      row({ Tier: null, "1st": "bravo" }),
    ]);
    await renderMenu({ config: makeConfig(), filters: makeFilters() });

    expect(cardArgs().players.map((p) => p.player)).toEqual(["alpha"]);
    expect(cardArgs().countsLine).toBe("1 players · 1 tournaments scored");
    spy.mockRestore();
  });

  test("the sort the link encodes is the sort the card is built with", async () => {
    useTournaments.mockReturnValue(sortFixture());
    await renderMenu({
      config: sortConfig(),
      filters: makeFilters({ sortBy: "Ppe", sortOrder: "desc" }),
    });

    expect(shareInput()).toHaveValue(linkFor("v1.e1.sppe"));
    expect(chipTexts()).toEqual(["Sorted by Pts/Event", "PPE min 1"]);
    expect(cardArgs().sortBy).toBe("Ppe");
    // Pts/Event order — neither the points order nor its reverse.
    expect(cardArgs().players.map((p) => p.player)).toEqual(["alpha", "charlie", "bravo"]);
  });

  test("a board-local sort order cannot leak onto the card", async () => {
    // Ascending is not shareable, so this encodes to the bare formula and the
    // card must show the points board. Had the raw props reached computeRankings
    // or sortPlayers the order would be bravo, charlie, alpha.
    useTournaments.mockReturnValue(sortFixture());
    await renderMenu({
      config: sortConfig(),
      filters: makeFilters({ sortBy: "Ppe", sortOrder: "asc" }),
    });

    expect(shareInput()).toHaveValue(linkFor("v1.e1"));
    expect(chipTexts()).toEqual(["PPE min 1"]);
    expect(cardArgs().sortBy).toBe("Points");
    expect(cardArgs().players.map((p) => p.player)).toEqual(["alpha", "bravo", "charlie"]);
  });

  test("a formula that scores nobody explains itself instead of rendering a card", async () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    useTournaments.mockReturnValue(countsFixture());
    await renderMenu({
      config: makeConfig({
        pointsVisibility: { first: false, second: false, top4: false, top8: false },
      }),
      filters: makeFilters(),
    });

    expect(notes()).toContain("This formula scores no players — nothing to put on a card.");
    expect(button("Download PNG")).toBeNull();
    expect(button("Copy image")).toBeNull();
    expect(preview()).toBeNull();
    expect(loadingBox()).toBeNull();
    expect(renderShareCard).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  test("a superseded render cannot overwrite the current preview", async () => {
    const first = deferred();
    const second = deferred();
    renderShareCard.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    useTournaments.mockReturnValue(sortFixture());

    await renderMenu({ config: makeConfig(), filters: makeFilters() });
    await renderMenu({ config: makeConfig(), filters: makeFilters({ lanOnly: true }) });
    expect(renderShareCard).toHaveBeenCalledTimes(2);

    const currentCanvas = makeCanvas("data:image/png;base64,CURRENT");
    const staleCanvas = makeCanvas("data:image/png;base64,STALE");

    await act(async () => {
      second.resolve(currentCanvas);
    });
    await act(async () => {
      first.resolve(staleCanvas);
    });

    expect(preview()).toHaveAttribute("src", "data:image/png;base64,CURRENT");

    // The `if (!alive) return` guard protects cardCanvasRef as well as the src.
    // Hoisting the ref assignment above that guard — a plausible "keep the ref
    // fresh" change — leaves the preview showing CURRENT while Download PNG
    // exports the STALE canvas. Reading the src alone cannot see that.
    await click(button("Download PNG"));

    expect(currentCanvas.toBlob).toHaveBeenCalledTimes(1);
    expect(staleCanvas.toBlob).not.toHaveBeenCalled();
  });
});

// ------------------------------------------------------------ the card actions

describe("the card actions", () => {
  const renderReadyCard = async () => {
    useTournaments.mockReturnValue(countsFixture());
    await renderMenu({ config: makeConfig(), filters: makeFilters() });
    await settle();
    expect(preview()).not.toBeNull();
  };

  test("download names the file and releases the object URL", async () => {
    await renderReadyCard();

    await click(button("Download PNG"));

    expect(canvas.toBlob).toHaveBeenCalledTimes(1);
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(URL.createObjectURL.mock.calls[0][0]).toBeInstanceOf(Blob);
    expect(anchorClicks).toEqual([
      { href: "blob:http://localhost/card-1", download: "quake-rankings-top10.png" },
    ]);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:http://localhost/card-1");
  });

  test("copy image writes a PNG clipboard item and shows no error note", async () => {
    stubClipboard();
    window.ClipboardItem = jest.fn(function (data) {
      this.data = data;
    });
    await renderReadyCard();

    await click(button("Copy image"));

    expect(button("Copied ✓")).not.toBeNull();
    expect(window.ClipboardItem).toHaveBeenCalledTimes(1);
    const item = window.ClipboardItem.mock.calls[0][0];
    expect(Object.keys(item)).toEqual(["image/png"]);
    expect(item["image/png"]).toBeInstanceOf(Blob);
    expect(navigator.clipboard.write.mock.calls[0][0]).toHaveLength(1);
    // "copied" is a state token, not a message — the note must stay hidden.
    expect(notes()).not.toContain("copied");
    expect(notes()).not.toContain("Image copy not supported here — use Download.");
  });

  test("copy image falls back to a message when the browser cannot do it", async () => {
    // jsdom has neither ClipboardItem nor navigator.clipboard.
    await renderReadyCard();

    await click(button("Copy image"));

    expect(notes()).toContain("Image copy not supported here — use Download.");
    expect(button("Copy image")).not.toBeNull();
    expect(button("Copied ✓")).toBeNull();
  });

  test("the image-copy error note clears after 2.5s, not before", async () => {
    // The card message has its own timer, longer than the link's 2s one. It is
    // the only thing that takes the "use Download" instruction off screen, so
    // its length is behaviour, not decoration.
    jest.useFakeTimers();
    try {
      await renderReadyCard();

      await click(button("Copy image"));
      expect(notes()).toContain("Image copy not supported here — use Download.");

      await act(async () => {
        jest.advanceTimersByTime(2499);
      });
      expect(notes()).toContain("Image copy not supported here — use Download.");

      await act(async () => {
        jest.advanceTimersByTime(1);
      });
      expect(notes()).not.toContain("Image copy not supported here — use Download.");
    } finally {
      jest.useRealTimers();
    }
  });
});
