import React, { useMemo, useState } from "react";
import { Container, Paper, Typography, FormControl, Select, MenuItem, Slider, TextField, List, ListItem, Checkbox, ListItemText } from "@mui/material";
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
import { assignColors } from "../lib/colorAssign";
import { resolveSelection, addPlayer, removePlayer, togglePlayer, searchPlayers } from "../lib/chartSelection";
import computeRankings from "../lib/computeRankings";
import { CURRENT_YEAR, YEAR_MIN, GAMES, MODES } from "../lib/formulaDefaults";
import computeWhoWasOne, { numberOnes, contenders, latestBoard, selectionView, pointsPerYearForPage, yearBest } from "../lib/computeWhoWasOne";

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
// (kept for reference; colours now come from lib/colorAssign's pool)
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
  // /charts filter bar (same defaults as AdvancedStats)
  const [selectedGame, setSelectedGame] = useState("All");
  const [selectedMode, setSelectedMode] = useState("All");
  const [yearRange, setYearRange] = useState([YEAR_MIN, CURRENT_YEAR]);
  const [lanOnly, setLanOnly] = useState(false);
  const filters = { selectedGame, selectedMode, yearRange, lanOnly };
  const filterKey = `${selectedGame}|${selectedMode}|${yearRange.join("-")}|${lanOnly}`;
  const pin = (name) => {
    setHovered(null);
    setPinned((p) => toggleFocus(p, name));
  };

  const { years, snapshots, reigns } = useMemo(
    () => computeWhoWasOne(tournaments, { ...config, ...filters, powerRanking }),
    [tournaments, powerRanking, filterKey, ...Object.values(config)]
  );
  // Stats line, same numbers /charts shows for these filters.
  const summary = useMemo(
    () => computeRankings(tournaments, { ...config, ...filters, powerRanking }),
    [tournaments, powerRanking, filterKey, ...Object.values(config)]
  );

  const leaders = numberOnes(reigns);
  const chasers = contenders(snapshots, reigns).map((c) => c.player);
  const defaults = [...leaders, ...chasers];
  const highlighted = resolveSelection(selection, defaults);
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
  // One combined pool: defaults keep their usual colour; everyone else gets
  // the most distinct free colour (see lib/colorAssign).
  const palette = useMemo(() => {
    const usual = {};
    leaders.forEach((n, i) => (usual[n] = PALETTE[i % PALETTE.length]));
    chasers.forEach((n, i) => (usual[n] = CONTENDER_PALETTE[i % CONTENDER_PALETTE.length]));
    return assignColors(highlighted, usual);
  }, [reigns, snapshots, selection]);
  const colorOf = (name) => palette[name] || FADED;
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
  // Crop to the first year any selected player has points.
  const firstIdx = Math.max(0, rel.byYear.findIndex((y) => y.leader));


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

  // Points per year (non-cumulative, /charts rule) + best of the selection each year.
  const perYear = useMemo(
    // Always all events: Power Ranking doesn't apply to a single year.
    () => pointsPerYearForPage(tournaments, { ...config, ...filters }),
    [tournaments, filterKey, ...Object.values(config)]
  );
  const best = useMemo(() => yearBest(perYear, highlighted, years), [perYear, years, selection, reigns]);
  const yearData = useMemo(
    () => ({
      labels,
      datasets: highlighted.map((name) => {
        const data = years.map((y) => perYear[name]?.[y] ?? null);
        const isBest = years.map((y, i) => best[i].player === name);
        return lineOf(name, {
          data,
          spanGaps: true, // like /charts: years without points are skipped
          pointRadius: isBest.map((b) => (b ? 7 : 2)),
          pointBorderColor: isBest.map((b) => (b ? TEXT : undefined)),
          pointBorderWidth: isBest.map((b) => (b ? 2 : 1)),
          pointHoverRadius: 7,
        });
      }),
    }),
    [perYear, best, focus, selection, reigns]
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
  const xAxis = { ...axis, min: labels[firstIdx] };
  const rankOptions = {
    responsive: true,
    maintainAspectRatio: false,
    ...interaction,
    scales: {
      x: xAxis,
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
    scales: { x: xAxis, y: { ...axis, beginAtZero: true } },
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

  const yearOptions = {
    ...pointsOptions,
    plugins: {
      legend,
      tooltip: {
        callbacks: {
          label: (c) => {
            const star = best[c.dataIndex]?.player === c.dataset.label ? " ★ best of selection" : "";
            return `${c.dataset.label}: ${c.parsed.y.toLocaleString("en-US")} pts that year${star}`;
          },
        },
      },
    },
  };

  return (
    <Container disableGutters maxWidth={false}>
      <div className="who-page">
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
          <button
            type="button"
            className={`plate${view === "year" ? " on" : ""}`}
            onClick={() => setView("year")}
          >
            <span className="led" />
            Points per year
          </button>
        </div>
        {/* Filter bar: same markup/classes as AdvancedStats (/charts) */}
        <div className="filter-bar">
          <div className="filter-field">
            <span className="filter-label">Game</span>
            <FormControl size="small" style={{ minWidth: "150px" }}>
              <Select
                value={selectedGame}
                onChange={(e) => setSelectedGame(e.target.value)}
                renderValue={(v) => (v === "All" ? "All games" : v)}
              >
                {["All", ...GAMES].map((game) => (
                  <MenuItem key={game} value={game}>
                    {game}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </div>

          <div className="filter-field">
            <span className="filter-label">Mode</span>
            <FormControl size="small" style={{ minWidth: "110px" }}>
              <Select value={selectedMode} onChange={(e) => setSelectedMode(e.target.value)}>
                {["All", ...MODES].map((mode) => (
                  <MenuItem key={mode} value={mode}>
                    {mode}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </div>

          <div className="filter-field years-field">
            <span className="filter-label">Years</span>
            <div className="yearline">
              <Slider
                value={yearRange}
                onChange={(e, v) => setYearRange(v)}
                valueLabelDisplay="auto"
                min={YEAR_MIN}
                max={CURRENT_YEAR}
                step={1}
              />
              <span className="yearval">
                {yearRange[0]}–{yearRange[1]}
              </span>
            </div>
          </div>

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

          <div className="toggle-plates">
            <button
              type="button"
              className={`plate${lanOnly ? " on" : ""}`}
              onClick={() => setLanOnly(!lanOnly)}
              title="Only LAN tournaments"
            >
              <span className="led" />
              LAN Only
            </button>
            <button
              type="button"
              className={`plate${powerRanking ? " on" : ""}${view === "year" ? " disabled" : ""}`}
              onClick={() => view !== "year" && setPowerRanking(!powerRanking)}
              disabled={view === "year"}
              title="Power Ranking scores each player on their best 25 events only, so long careers full of minor results don't outweigh peak performance."
            >
              <span className="led" />
              Power Ranking
            </button>
          </div>
        </div>
        <div className="who-pr-note-line">
          <span className="who-pr-note">
            {view === "year"
              ? "Power Ranking doesn't apply here, since a single year rarely has 25 events."
              : "Power Ranking only counts the top 25 events of each player."}
          </span>
        </div>

        {/* Summary Message (same as /charts) */}
        <Typography component="div" className="summary-line">
          <b>{summary.players.length.toLocaleString("en-US")}</b> players ·{" "}
          <b>{(summary.totalTournaments - summary.filteredCount).toLocaleString("en-US")}</b>{" "}
          tournaments · {summary.filteredCount.toLocaleString("en-US")} filtered
        </Typography>

        <div className="who-picker-bar">
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
              ) : view === "year" ? (
                <Line data={yearData} options={yearOptions} />
              ) : (
                <Line data={pointsData} options={pointsOptions} />
              )}
            </div>
          )}
          {years.length > 0 && (
            <>
            {view === "year" && <div className="who-band-label">#1 all-time standings</div>}
            <div className="who-band" aria-label="#1 at each year end">
              {rel.byYear.slice(firstIdx).map((y) => (
                <span
                  key={y.year}
                  className="who-band-cell"
                  title={`${y.year}: ${y.leader ?? "-"}`}
                  style={{ background: y.leader ? colorOf(y.leader) : "transparent" }}
                />
              ))}
            </div>
            </>
          )}
          {years.length > 0 && view === "year" && (
            <>
              <div className="who-band-label">Best that year (among selected)</div>
              <div className="who-band who-band-best" aria-label="best performer each year">
                {best.slice(firstIdx).map((b) => (
                  <span
                    key={b.year}
                    className="who-band-cell"
                    title={`${b.year}: ${b.player ? `${b.player}, ${b.points.toLocaleString("en-US")} pts` : "-"}`}
                    style={{ background: b.player ? colorOf(b.player) : "transparent" }}
                  />
                ))}
              </div>
            </>
          )}
        </Paper>
        {view === "year" && (
          <p className="method-lede who-note">
            Points earned in each year alone (not cumulative), same as Performance Per Year on
            Advanced Stats. ★ / ringed point = best of the selection that year; the top band shows
            it, the bottom band and the reign list stay the all-time standings.
          </p>
        )}
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
