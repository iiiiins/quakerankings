// Hover/tap focus for the Who-was-#1 charts. The focused player is drawn at
// full strength and every other line dims to DIM_ALPHA; null = no focus.
export const DIM_ALPHA = 0.15;

// "#rrggbb" -> "rgba(r,g,b,a)"
export function withAlpha(hex, alpha) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

export function focusStyle(name, focus, color, baseWidth) {
  if (!focus) return { color, width: baseWidth };
  if (name === focus) return { color, width: baseWidth + 2 };
  return { color: withAlpha(color, DIM_ALPHA), width: Math.max(1, baseWidth - 1) };
}

// Click/tap: same item again clears, another item moves the pin.
export function toggleFocus(pinned, name) {
  return pinned === name ? null : name;
}
