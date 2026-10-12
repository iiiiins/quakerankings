import { withAlpha, focusStyle, toggleFocus, DIM_ALPHA } from "./lineFocus";

test("withAlpha converts hex", () => {
  expect(withAlpha("#e05a1f", 0.15)).toBe("rgba(224,90,31,0.15)");
});

test("focusStyle: no focus keeps base, focused thickens, others dim", () => {
  expect(focusStyle("a", null, "#ffffff", 3)).toEqual({ color: "#ffffff", width: 3 });
  expect(focusStyle("a", "a", "#ffffff", 3)).toEqual({ color: "#ffffff", width: 5 });
  expect(focusStyle("b", "a", "#ffffff", 2)).toEqual({ color: `rgba(255,255,255,${DIM_ALPHA})`, width: 1 });
});

test("toggleFocus: tapping the same item resets", () => {
  expect(toggleFocus(null, "a")).toBe("a");
  expect(toggleFocus("a", "a")).toBeNull();
  expect(toggleFocus("a", "b")).toBe("b");
});

// Regression: hovering a legend entry used to reorder the legend (chart.js
// builds legend items in `order`), so the cursor landed on another player.
test("legend order stays fixed whoever is focused", async () => {
  const { drawOrder, legendSort } = await import("./lineFocus");
  const names = ["thresh", "stelam", "cypher", "serious"];
  const base = [0, 1, 1, 1];
  const legendFor = (focus) => {
    // mimic chart.js: items generated from metas sorted by `order`, then labels.sort
    const items = names
      .map((text, datasetIndex) => ({ text, datasetIndex, order: drawOrder(text, focus, base[datasetIndex]) }))
      .sort((a, b) => a.order - b.order || a.datasetIndex - b.datasetIndex);
    return items.sort(legendSort).map((i) => i.text);
  };
  for (const focus of [null, ...names]) expect(legendFor(focus)).toEqual(names);
  // the focused line still draws on top
  expect(drawOrder("serious", "serious", 1)).toBeLessThan(drawOrder("thresh", "serious", 0));
});

test("added-player palette keeps >= 7:1 contrast on the page background", async () => {
  const { ADDED_PALETTE } = await import("../components/WhoWasOnePage");
  const lum = (h) => {
    const c = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const bg = lum("#14120e");
  ADDED_PALETTE.forEach((h) => expect((lum(h) + 0.05) / (bg + 0.05)).toBeGreaterThanOrEqual(7));
});

test("added-player colours are >= 15deg in hue from every #1-holder/contender colour and each other", async () => {
  const { ADDED_PALETTE, PALETTE, CONTENDER_PALETTE } = await import("../components/WhoWasOnePage");
  const hue = (h) => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
    const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
    if (!d) return 0;
    const x = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return (x * 60 + 360) % 360;
  };
  const dist = (a, b) => { const d = Math.abs(hue(a) - hue(b)); return Math.min(d, 360 - d); };
  const reserved = [...PALETTE, ...CONTENDER_PALETTE];
  ADDED_PALETTE.forEach((c, i) => {
    reserved.forEach((r) => expect(dist(c, r)).toBeGreaterThanOrEqual(15));
    ADDED_PALETTE.slice(i + 1).forEach((o) => expect(dist(c, o)).toBeGreaterThanOrEqual(15));
  });
  expect(dist("#ff8a80", "#ff8a65")).toBeLessThan(15); // the old serious-vs-cypher clash
});
