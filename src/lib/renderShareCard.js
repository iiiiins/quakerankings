// Client-side canvas render of the top-10 share card (1200×630 — chat-embed
// landscape). This is the Discord answer: the formula lives in a URL
// fragment, so link previews stay generic — the card is what makes a shared
// ranking look like something. Drawn in the site's visual language (ember on
// warm gunmetal, Orbitron names, medal ranks); fonts are awaited before
// drawing so the first render doesn't fall back to system sans.

const W = 1200;
const H = 630;
const LEFT = 56;
const RIGHT = W - 56;

const EMBER = "#e05a1f";
const NAME_YELLOW = "#ffff72";
const TEXT = "#ece8df";
const MUTED = "#6e6859";
const RANK_COLORS = { 1: "#f5c518", 2: "#c8ccd4", 3: "#e2a35e" };
const PLACEMENT_COLS = [
  ["first", "1ST", "#f5c518"],
  ["second", "2ND", "#c8ccd4"],
  ["top4", "T4", "#e2a35e"],
  ["top8", "T8", "#b06a1e"],
];

const truncate = (ctx, text, maxWidth) => {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + "…").width > maxWidth) t = t.slice(0, -1);
  return t + "…";
};

const pill = (ctx, text, x, y) => {
  ctx.font = "600 13.5px Rajdhani, sans-serif";
  const w = ctx.measureText(text).width + 24;
  ctx.fillStyle = "rgba(224, 90, 31, 0.12)";
  ctx.strokeStyle = "rgba(224, 90, 31, 0.35)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, 26, 13);
  else ctx.rect(x, y, w, 26);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = TEXT;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x + 12, y + 14);
  ctx.textBaseline = "alphabetic";
  return w;
};

export default async function renderShareCard({ players, chips, countsLine }) {
  // Orbitron/Rajdhani are already loaded by the page CSS; this awaits the
  // specific weights so the canvas never draws with a fallback font.
  try {
    await Promise.all([
      document.fonts.load('900 30px "Orbitron"'),
      document.fonts.load('700 20px "Orbitron"'),
      document.fonts.load('700 21px "Rajdhani"'),
      document.fonts.load('600 14px "Rajdhani"'),
    ]);
    await document.fonts.ready;
  } catch {
    // font API unavailable — draw anyway with whatever resolves
  }

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");

  // ---- atmosphere: warm black, ember vignette, scanlines, top strip, frame
  ctx.fillStyle = "#0b0a08";
  ctx.fillRect(0, 0, W, H);

  const vignette = ctx.createRadialGradient(W / 2, 0, 0, W / 2, 0, 520);
  vignette.addColorStop(0, "rgba(224, 90, 31, 0.08)");
  vignette.addColorStop(1, "rgba(224, 90, 31, 0)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, W, 520);

  ctx.fillStyle = "rgba(255, 255, 255, 0.014)";
  for (let y = 0; y < H; y += 3) ctx.fillRect(0, y, W, 1);

  ctx.fillStyle = EMBER;
  ctx.fillRect(0, 0, W, 4);

  ctx.strokeStyle = "#2e2922";
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, W - 2, H - 2);

  // ---- header
  if ("letterSpacing" in ctx) ctx.letterSpacing = "2px";
  ctx.textBaseline = "alphabetic";
  ctx.font = '900 30px "Orbitron", sans-serif';
  ctx.textAlign = "left";
  ctx.shadowColor = "rgba(255, 255, 114, 0.35)";
  ctx.shadowBlur = 18;
  ctx.fillStyle = NAME_YELLOW;
  ctx.fillText("QUAKE", LEFT, 58);
  ctx.shadowBlur = 0;
  ctx.fillStyle = TEXT;
  ctx.fillText(" PLAYER RANKINGS", LEFT + ctx.measureText("QUAKE").width, 58);

  if ("letterSpacing" in ctx) ctx.letterSpacing = "3px";
  ctx.font = "700 17px Rajdhani, sans-serif";
  ctx.fillStyle = EMBER;
  ctx.textAlign = "right";
  ctx.fillText("TOP 10 · CUSTOM FORMULA", RIGHT, 56);
  if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";

  // ---- chips row (what's customized)
  let chipX = LEFT;
  let shown = 0;
  for (const chip of chips) {
    ctx.font = "600 13.5px Rajdhani, sans-serif";
    const w = ctx.measureText(chip).width + 24;
    if (chipX + w > RIGHT - 110 && shown > 0) break;
    chipX += pill(ctx, chip, chipX, 84) + 8;
    shown++;
  }
  if (shown < chips.length) pill(ctx, `+${chips.length - shown} more`, chipX, 84);

  // ---- rows
  const top10 = players.slice(0, 10);
  const rowH = 43;
  const rowsTop = 128;

  top10.forEach((p, i) => {
    const yTop = rowsTop + i * rowH;
    const base = yTop + 28;

    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(LEFT, yTop + rowH - 0.5);
    ctx.lineTo(RIGHT, yTop + rowH - 0.5);
    ctx.stroke();

    const rank = i + 1;
    ctx.font = "700 19px Rajdhani, sans-serif";
    ctx.textAlign = "right";
    if (rank === 1) {
      ctx.shadowColor = "rgba(245, 197, 24, 0.4)";
      ctx.shadowBlur = 10;
    }
    ctx.fillStyle = RANK_COLORS[rank] || MUTED;
    ctx.fillText(String(rank).padStart(2, "0"), LEFT + 34, base);
    ctx.shadowBlur = 0;

    ctx.font = '700 20px "Orbitron", sans-serif';
    ctx.textAlign = "left";
    ctx.shadowColor = "rgba(255, 255, 114, 0.18)";
    ctx.shadowBlur = 10;
    ctx.fillStyle = NAME_YELLOW;
    ctx.fillText(truncate(ctx, p.player, 320), LEFT + 52, base);
    ctx.shadowBlur = 0;

    let px = 470;
    PLACEMENT_COLS.forEach(([key, label, color]) => {
      const n = String(p.placements?.[key] || 0);
      ctx.font = "700 16px Rajdhani, sans-serif";
      ctx.textAlign = "left";
      ctx.fillStyle = color;
      ctx.fillText(n, px, base);
      const nw = ctx.measureText(n).width;
      ctx.font = "600 10px Rajdhani, sans-serif";
      ctx.fillStyle = MUTED;
      ctx.fillText(label, px + nw + 4, base);
      px += 90;
    });

    const maxPoints = top10[0]?.points || 1;
    const barW = Math.max(10, Math.round((p.points / maxPoints) * 220));
    const barGrad = ctx.createLinearGradient(RIGHT - barW, 0, RIGHT, 0);
    barGrad.addColorStop(0, EMBER);
    barGrad.addColorStop(1, "#f5c518");
    ctx.fillStyle = barGrad;
    ctx.fillRect(RIGHT - barW, yTop + 33, barW, 3);

    ctx.font = "700 21px Rajdhani, sans-serif";
    ctx.textAlign = "right";
    ctx.fillStyle = "#ffffff";
    ctx.fillText((p.points || 0).toLocaleString("en-US"), RIGHT, base);
  });

  // ---- footer
  ctx.strokeStyle = "#2e2922";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(LEFT, 578.5);
  ctx.lineTo(RIGHT, 578.5);
  ctx.stroke();

  ctx.font = "600 14px Rajdhani, sans-serif";
  ctx.textAlign = "left";
  ctx.fillStyle = MUTED;
  ctx.fillText(countsLine, LEFT, 606);

  if ("letterSpacing" in ctx) ctx.letterSpacing = "1px";
  ctx.font = "700 14.5px Rajdhani, sans-serif";
  ctx.textAlign = "right";
  ctx.fillStyle = EMBER;
  ctx.fillText("iiiiins.github.io/quakerankings", RIGHT, 606);
  if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";

  return canvas;
}
