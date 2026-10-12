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
