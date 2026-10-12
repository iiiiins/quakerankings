// Colour assignment for the Who-was-#1 charts. Default players (#1 holders,
// contenders) keep their usual colour while selected; everyone else gets the
// free pool colour farthest (CIE76 ΔE in Lab) from every colour already in
// use, so no two selected players look alike. Pool = the default palettes
// (freed when their owner is removed) + extras, all readable on the page bg.
export const BG = "#14120e";
export const EXTRA_PALETTE = [
  "#33ff9c", "#b399ff", "#ff80dd", "#66ff33", "#ff5252", "#40c4ff", "#ffd740",
  "#e040fb", "#18ffff", "#ffab40", "#8c9eff", "#ffffff", "#f4ff81", "#a7ffeb",
  "#ff9e80", "#69f0ae", "#ff4081", "#b388ff",
];

const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
const lin = (x) => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4);

export function luminance(hex) {
  const [r, g, b] = rgb(hex).map(lin);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export const contrast = (a, b) => {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

export function lab(hex) {
  const [r, g, b] = rgb(hex).map(lin);
  const f = (t) => (t > 216 / 24389 ? Math.cbrt(t) : (841 / 108) * t + 4 / 29);
  const X = f((0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047);
  const Y = f(0.2126 * r + 0.7152 * g + 0.0722 * b);
  const Z = f((0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883);
  return [116 * Y - 16, 500 * (X - Y), 200 * (Y - Z)];
}
export const deltaE = (a, b) => {
  const [p, q] = [lab(a), lab(b)];
  return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
};

const MIN_CONTRAST = 4.5;

// selected: names in display order; usual: {name: colour} for default players.
export function assignColors(selected, usual, extras = EXTRA_PALETTE) {
  const out = {};
  selected.forEach((n) => {
    if (usual[n]) out[n] = usual[n];
  });
  const pool = [...new Set([...Object.values(usual), ...extras])]
    .map((c) => c.toLowerCase())
    .filter((c) => contrast(c, BG) >= MIN_CONTRAST);
  selected.forEach((n) => {
    if (out[n]) return;
    const used = Object.values(out).map((c) => c.toLowerCase());
    let best = null;
    let bestD = -1;
    pool.forEach((c) => {
      if (used.includes(c)) return;
      const d = used.length ? Math.min(...used.map((u) => deltaE(c, u))) : Infinity;
      if (d > bestD) {
        best = c;
        bestD = d;
      }
    });
    out[n] = best || "#6e6859";
  });
  return out;
}
