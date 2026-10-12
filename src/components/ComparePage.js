import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Container, Paper, TextField } from "@mui/material";
import { useTournamentsStatus } from "../hooks/useTournaments";
import LoadState from "./LoadState";
import computeRankings from "../lib/computeRankings";
import comparePlayers from "../lib/comparePlayers";
import { formatPpe } from "../lib/sortPlayers";
import { CURRENT_YEAR, YEAR_MIN } from "../lib/formulaDefaults";

// "/compare" route (5th header tab — the nav model decided at feature 6).
// Pick two players, see their numbers side by side under the visitor's
// formula: the gear config arrives as props and the ranking recomputes here
// with NEUTRAL filters (RecordsPage is the model) — home-board filters never
// reach it. The pure half is lib/comparePlayers.js (pinned by
// scripts/check-compare.js + its jest suite); this file only picks the two
// names and renders the sides that module returns.

const STATS = [
  { key: "rank", label: "Rank", better: "low", format: (v) => `#${v}` },
  { key: "points", label: "Points", better: "high", format: (v) => v.toLocaleString("en-US") },
  { key: "events", label: "Events", better: "high", format: (v) => v.toLocaleString("en-US") },
  { key: "ppe", label: "Pts/Event", better: "high", format: formatPpe },
  { key: "firsts", label: "1st", better: "high", tone: "t-g" },
  { key: "seconds", label: "2nd", better: "high", tone: "t-s" },
  { key: "top4", label: "Top 4", better: "high", tone: "t-b" },
  { key: "top8", label: "Top 8", better: "high", tone: "t-c" },
];

// Who leads a row. ppe stays null below the min-events threshold (same as
// the board's dash) — a null on either side means no leader, and equal
// values highlight neither.
const leader = (a, b, better) => {
  if (a == null || b == null || a === b) return null;
  const aWins = better === "low" ? a < b : a > b;
  return aWins ? "left" : "right";
};

const fmt = (stat, v) => (stat.format ? stat.format(v) : v);

// Same search-and-pick surface as the AdvancedStats "add player" field. The
// picked name stays in the box; typing anything else reopens the matches.
const PlayerPicker = ({ label, value, players, onPick }) => {
  const [query, setQuery] = useState("");
  const wanted = query.trim().toLowerCase();
  const open = wanted !== "" && wanted !== (value || "").toLowerCase();
  const matches = open
    ? players.filter((p) => p.player.toLowerCase().includes(wanted)).slice(0, 10)
    : [];
  return (
    <div className="filter-field search-field" style={{ position: "relative" }}>
      <span className="filter-label">{label}</span>
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
                onPick(p.player);
                setQuery(p.player);
              }}
            >
              {p.player} · {p.points.toLocaleString("en-US")} pts
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const ComparePage = ({
  pointsConfig,
  pointsVisibility,
  gameWeights,
  gameVisibility,
  tierWeights,
  tierVisibility,
  modeWeights,
  modeVisibility,
  minEventsForPpe,
}) => {
  const { tournaments: tournamentList, loading: tLoading, error: tError } = useTournamentsStatus();
  const [nameA, setNameA] = useState("");
  const [nameB, setNameB] = useState("");

  const { players } = useMemo(
    () =>
      // neutral filters: the comparison runs over the full dataset; only the
      // gear (weights + visibility) shapes the numbers
      computeRankings(tournamentList, {
        selectedGame: "All",
        selectedMode: "All",
        yearRange: [YEAR_MIN, CURRENT_YEAR],
        lanOnly: false,
        powerRanking: false,
        pointsConfig,
        pointsVisibility,
        gameWeights,
        gameVisibility,
        tierWeights,
        tierVisibility,
        modeWeights,
        modeVisibility,
        minEventsForPpe,
      }),
    [
      tournamentList,
      pointsConfig,
      pointsVisibility,
      gameWeights,
      gameVisibility,
      tierWeights,
      tierVisibility,
      modeWeights,
      modeVisibility,
      minEventsForPpe,
    ]
  );

  // ok:false still renders (as the error line below): a picked player can
  // drop out of the ranking when the gear hides their whole game.
  const result = useMemo(
    () => (nameA && nameB ? comparePlayers(players, nameA, nameB) : null),
    [players, nameA, nameB]
  );

  if (tLoading || tError) {
    return (
      <Container disableGutters maxWidth={false}>
        <LoadState error={tError} label="Loading players…" />
      </Container>
    );
  }

  return (
    <Container disableGutters maxWidth={false}>
      <div className="cmp-page">
        <h2 className="method-title">Compare</h2>
        <p className="method-lede">
          Two players side by side under <b>your</b> formula. Open the settings
          gear, reweight or hide anything, and both sides recompute.
        </p>

        <div className="filter-bar">
          <PlayerPicker
            label="Player 1"
            value={nameA}
            players={players}
            onPick={setNameA}
          />
          <PlayerPicker
            label="Player 2"
            value={nameB}
            players={players}
            onPick={setNameB}
          />
        </div>

        {!result && <div className="rec-empty">Pick two players to compare</div>}
        {result && !result.ok && <div className="rec-empty">{result.error}</div>}
        {result && result.ok && (
          <Paper elevation={0} className="game-section cmp-card">
            <div className="cmp-head">
              <Link className="cmp-name" to={`/players/${result.left.name}`}>
                {result.left.name}
              </Link>
              <span className="cmp-vs">vs</span>
              <Link
                className="cmp-name cmp-right"
                to={`/players/${result.right.name}`}
              >
                {result.right.name}
              </Link>
            </div>
            <div className="cmp-rows">
              {STATS.map((stat) => {
                const lv = result.left[stat.key];
                const rv = result.right[stat.key];
                const lead = leader(lv, rv, stat.better);
                return (
                  <div key={stat.key} className="cmp-row">
                    <span className={`cmp-val${lead === "left" ? " lead" : ""}`}>
                      {fmt(stat, lv)}
                    </span>
                    <span className={`cmp-stat${stat.tone ? ` ${stat.tone}` : ""}`}>
                      {stat.label}
                    </span>
                    <span
                      className={`cmp-val cmp-right${lead === "right" ? " lead" : ""}`}
                    >
                      {fmt(stat, rv)}
                    </span>
                  </div>
                );
              })}
            </div>
          </Paper>
        )}
      </div>
    </Container>
  );
};

export default ComparePage;
