import React, { useMemo, useState } from "react";
import { Container, Paper, Switch, TextField, List, ListItem, Checkbox, ListItemText } from "@mui/material";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from "chart.js";
import useTournaments from "../hooks/useTournaments";
import { focusStyle, toggleFocus, drawOrder, legendSort } from "../lib/lineFocus";
import { resolveSelection, addPlayer, removePlayer, togglePlayer, searchPlayers } from "../lib/chartSelection";
import computeWhoWasOne, { numberOnes, contenders, latestBoard, selectionView } from "../lib/computeWhoWasOne";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

// "/who-was-1" route. Replays the all-time board year by year under the
// visitor's formula (gear props, same as Records/Compare) and plots who held
// #1. Page-local Power Ranking plate (seeded from the home board) — the
// replay runs through computeRankings, so best-25 applies per snapshot.

const BG = "#14120e";
const GRID = "#2e2922";
const TEXT = "#ece8df";
const MUTED = "#a39c8d";
const FADED = "#6e6859";
// Contenders: cooler/pastel hues, dashed, so #1 holders still lead the eye.
export const CONTENDER_PALETTE = ["#9fa8da", "#80deea", "#c5e1a5", "#ffcc80", "#bcaaa4"];
// Players the visitor adds: solid, mid-weight, their own hues.
// >= 7:1 contrast on #14120e and >= 15deg hue from every #1-holder/contender
// colour (pinned by tests) — the free hue gaps are few, so 4 that cycle.
export const ADDED_PALETTE = ["#33ff9c", "#b399ff", "#ff80dd", "#66ff33"];
export const PALETTE = ["#e05a1f", "#ffff72", "#4fc3f7", "#81c784", "#ce93d8", "#ff8a65", "#f06292", "#4db6ac", "#fff176", "#90a4ae"];

const WhoWasOnePage = ({ initialPowerRanking = false, ...config }) => {
  const tournaments = useTournaments();
  const [view, setView] = useState("ranks");
  const [powerRanking, setPowerRanking] = useState(Boolean(initialPowerRanking));
  // hover = transient (mouse); pinned = click/tap, survives mouse leave.
  const [hovered, setHovered] = useState(null);
  const [pinned, setPinned] = useState(null);
  const focus = hovered || pinned;
  // Taps also fire hover on touch screens, so a pin/unpin clears hover too —
  // otherwise tapping the same item again could never reset.
  // null = default set (follows the formula); array once edited.
  const [selection, setSelection] = useState(null);
  const [query, setQuery] = useState("");
  const pin = (name) => {
    setHovered(null);
    setPinned((p) => toggleFocus(p, name));
  };

  const { years, snapshots, reigns } = useMemo(
    () => computeWhoWasOne(tournaments, { ...config, powerRanking }),
    [tournaments, powerRanking, ...Object.values(config)]
  );

  const leaders = numberOnes(reigns);
  const chasers = contenders(snapshots, reigns).map((c) => c.player);
  const defaults = [...leaders, ...chasers];
  const highlighted = resolveSelection(selection, defaults);
  const added = highlighted.filter((n) => !defaults.includes(n));
  const board = useMemo(() => latestBoard(snapshots), [snapshots]);
  const matches = searchPlayers(board, query, highlighted);
  const onChart = (name) => highlighted.includes(name);
  // Everything below the picker (band, reigns, ranks) is relative to the
  // selection: #1 = leader among the selected players that year.
  const rel = useMemo(() => selectionView(snapshots, highlighted), [snapshots, selection, reigns]);
  const shownChasers = chasers.filter((n) => highlighted.includes(n));
  const yMax = Math.max(1, Math.min(8, highlighted.length));
  const resetPlayers = () => {
    setSelection(null);
    setPinned(null);
    setHovered(null);
  };
  const edit = (next) => {
    setSelection(next);
    if (pinned && !next.includes(pinned)) setPinned(null);
    setHovered(null);
  };
  const colorOf = (name) => {
    const i = leaders.indexOf(name);
    if (i >= 0) return PALETTE[i % PALETTE.length];
    const j = chasers.indexOf(name);
    if (j >= 0) return CONTENDER_PALETTE[j % CONTENDER_PALETTE.length];
    const k = added.indexOf(name);
    return k >= 0 ? ADDED_PALETTE[k % ADDED_PALETTE.length] : FADED;
  };
  const styleOf = (name) =>
    leaders.includes(name)
      ? { borderWidth: 3, order: 0 }
      : chasers.includes(name)
      ? { borderWidth: 2, borderDash: [6, 4], order: 1 }
      : { borderWidth: 2, order: 1 };
  // Only #1 holders and contenders are drawn; focus dims everyone else.
  const lineOf = (name, extra) => {
    const base = styleOf(name);
    const f = focusStyle(name, focus, colorOf(name), base.borderWidth);
    return {
      label: name,
      ...base,
      ...extra,
      borderColor: f.color,
      backgroundColor: f.color,
      borderWidth: f.width,
      order: drawOrder(name, focus, base.order),
    };
  };
  const labels = years.map((y) => `'${String(y).slice(2)}`);

  const rankData = useMemo(
    () => ({
      labels,
      datasets: highlighted.map((name) => {
        // Rank among the selection; no points yet (or past #8) = gap.
        const data = rel.byYear.map((y) => {
          const r = y.ranks[name];
          return r && r <= 8 ? r : null;
        });
        return lineOf(name, {
          data,
          pointRadius: data.map((r) => (r === 1 ? 6 : 3)),
          pointHoverRadius: 7,
          spanGaps: false,
        });
      }),
    }),
    [snapshots, reigns, focus, selection, rel]
  );

  const pointsData = useMemo(
    () => ({
      labels,
      datasets: highlighted.map((name) =>
        lineOf(name, {
          // Real points every year the player is on the board, top 8 or not.
          data: snapshots.map((s) => s.all?.[name]?.points ?? null),
          pointRadius: 2,
          pointHoverRadius: 6,
        })
      ),
    }),
    [snapshots, reigns, focus, selection]
  );

  // Shared interaction: hovering a line/point or legend name focuses it;
  // click/tap pins (same item again unpins). Legend click never hides.
  const nameAt = (chart, elements) =>
    elements && elements.length ? chart.data.datasets[elements[0].datasetIndex]?.label : null;
  const interaction = {
    interaction: { mode: "nearest", intersect: false, axis: "xy" },
    onHover: (evt, elements, chart) => {
      const name = nameAt(chart, chart.getElementsAtEventForMode(evt, "nearest", { intersect: true }, false));
      if (name !== hovered) setHovered(name);
    },
    onClick: (evt, elements, chart) => {
      const name = nameAt(chart, chart.getElementsAtEventForMode(evt, "nearest", { intersect: false }, false));
      if (name) pin(name);
    },
  };
  const legend = {
    labels: {
      color: TEXT,
      usePointStyle: true,
      padding: 14,
      sort: legendSort,
    },
    // Names come from the dataset, not item.text (which may carry a suffix).
    onHover: function (evt, item) { setHovered(this.chart.data.datasets[item.datasetIndex]?.label ?? null); },
    onLeave: () => setHovered(null),
    onClick: function (evt, item) { pin(this.chart.data.datasets[item.datasetIndex]?.label); },
  };

  const axis = { grid: { color: GRID }, ticks: { color: MUTED } };
  const rankOptions = {
    responsive: true,
    maintainAspectRatio: false,
    ...interaction,
    scales: {
      x: axis,
      y: { ...axis, reverse: true, min: 1, max: yMax, ticks: { color: MUTED, stepSize: 1, callback: (v) => `#${v}` } },
    },
    plugins: {
      legend,
      tooltip: { callbacks: { label: (c) => `${c.dataset.label}: #${c.parsed.y}` } },
    },
  };
  const pointsOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: { x: axis, y: { ...axis, beginAtZero: true } },
    ...interaction,
    plugins: {
      legend,
      tooltip: {
        callbacks: {
          label: (c) => {
            const name = c.dataset.label;
            const overall = snapshots[c.dataIndex]?.all?.[name]?.rank;
            const among = rel.byYear[c.dataIndex]?.ranks[name];
            return `${name}: ${c.parsed.y.toLocaleString("en-US")} pts, #${among} of selected (#${overall} overall)`;
          },
        },
      },
    },
  };

  return (
    <Container maxWidth="lg">
      <div className="rec-page who-page">
        <h2 className="method-title">Who was #1</h2>
        <p className="method-lede">
          The all-time board replayed at the end of every year, using only events up to that
          year, under your current formula.
        </p>
        <div className="rec-tools toggle-plates">
          <button
            type="button"
            className={`plate${view === "ranks" ? " on" : ""}`}
            onClick={() => setView("ranks")}
          >
            <span className="led" />
            Top 8 by year
          </button>
          <button
            type="button"
            className={`plate${view === "points" ? " on" : ""}`}
            onClick={() => setView("points")}
          >
            <span className="led" />
            Points race
          </button>
        </div>
        {/* Scoring switch, deliberately not a view plate */}
        <label
          className="who-pr"
          title="Power Ranking scores each player on their best 25 events only, so long careers full of minor results don't outweigh peak performance."
        >
          <Switch
            size="small"
            color="primary"
            checked={powerRanking}
            onChange={() => setPowerRanking(!powerRanking)}
          />
          <span className="who-pr-label">Power Ranking</span>
          <span className="who-pr-note">Only counts the top 25 events of each player</span>
        </label>
        <div className="who-picker-bar">
          <div className="filter-field search-field" style={{ position: "relative" }}>
            <span className="filter-label">Add player to chart</span>
            <TextField
              size="small"
              placeholder="Search players…"
              variant="outlined"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              fullWidth
            />
            {matches.length > 0 && (
              <div className="search-results">
                {matches.map((p) => (
                  <div
                    key={p.player}
                    className="search-result"
                    onClick={() => {
                      edit(addPlayer(selection, defaults, p.player));
                      setQuery("");
                    }}
                  >
                    {p.player} · #{p.rank} · {p.points.toLocaleString("en-US")} pts
                  </div>
                ))}
              </div>
            )}
          </div>
          <button
            type="button"
            className={`plate${selection === null ? " on" : ""}`}
            onClick={resetPlayers}
            title="Back to the #1 holders + contenders"
          >
            <span className="led" />
            Reset players
          </button>
        </div>
        <div className="who-chips">
          {highlighted.map((name) => (
            <span
              key={name}
              className={`who-chip${focus && focus !== name ? " dim" : ""}`}
              onMouseEnter={() => setHovered(name)}
              onMouseLeave={() => setHovered(null)}
            >
              <span className="who-dot" style={{ background: colorOf(name) }} />
              <span className="who-chip-name" onClick={() => pin(name)}>
                {name}
              </span>
              <button
                type="button"
                className="who-chip-x"
                aria-label={`Remove ${name}`}
                onClick={() => edit(removePlayer(selection, defaults, name))}
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <Paper className="who-chart" style={{ background: BG }}>
          {years.length === 0 ? (
            <div className="rec-empty">Loading…</div>
          ) : (
            <div style={{ height: 460 }} onMouseLeave={() => setHovered(null)} data-testid={`who-chart-${view}`}>
              {view === "ranks" ? (
                <Line data={rankData} options={rankOptions} />
              ) : (
                <Line data={pointsData} options={pointsOptions} />
              )}
            </div>
          )}
          {years.length > 0 && (
            <div className="who-band" aria-label="#1 at each year end">
              {rel.byYear.map((y) => (
                <span
                  key={y.year}
                  className="who-band-cell"
                  title={`${y.year}: ${y.leader ?? "-"}`}
                  style={{ background: y.leader ? colorOf(y.leader) : "transparent" }}
                />
              ))}
            </div>
          )}
        </Paper>
        {view === "ranks" && (
          <p className="method-lede who-note">
            Ranks are among the selected players only. A gap means the player had no points yet
            {highlighted.length > 8 ? " or was below #8 of the selection" : ""} that year.
          </p>
        )}
        {shownChasers.length > 0 && (
          <p className="method-lede who-contenders">
            Dashed: closest players who never held #1 overall under this formula (sum over year-ends
            of 9 − rank while in the top 8): {shownChasers.join(", ")}.
          </p>
        )}
        <ul className="who-reigns">
          {rel.reigns.map((r) => (
            <li
              key={`${r.player}-${r.from}`}
              className={focus && focus !== r.player ? "dim" : ""}
              onMouseEnter={() => setHovered(r.player)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => pin(r.player)}
            >
              <span className="who-dot" style={{ background: colorOf(r.player) }} />
              <strong>{r.player}</strong>
              <span className="who-years">{r.from === r.to ? r.from : `${r.from}–${r.to}`}</span>
            </li>
          ))}
        </ul>
        {/* Same "top 25" picker as /charts, from the latest year-end board */}
        <div className="picker-panel">
          <span className="filter-label">Player selection — top 25</span>
          <List dense className="picker-list">
            {board.slice(0, 25).map((p) => (
              <ListItem className="player-list-item" key={p.player}>
                <Checkbox
                  size="small"
                  checked={onChart(p.player)}
                  onChange={() => edit(togglePlayer(selection, defaults, p.player))}
                />
                <ListItemText
                  disableTypography
                  primary={
                    <span className="picker-row">
                      <span className="picker-name">{p.player}</span>
                      <span className="picker-points">{p.points.toLocaleString("en-US")} pts</span>
                    </span>
                  }
                />
              </ListItem>
            ))}
          </List>
        </div>
      </div>
    </Container>
  );
};

export default WhoWasOnePage;
