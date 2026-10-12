import React, { useMemo, useState } from "react";
import { Container, Paper } from "@mui/material";
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
import computeWhoWasOne, { numberOnes, contenders } from "../lib/computeWhoWasOne";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

// "/who-was-1" route. Replays the all-time board year by year under the
// visitor's formula (gear props, same as Records/Compare) and plots who held
// #1. Page-local Power Ranking plate (seeded from the home board) — the
// replay runs through computeRankings, so best-25 applies per snapshot.

const BG = "#14120e";
const GRID = "#2e2922";
const TEXT = "#ece8df";
const MUTED = "#a39c8d";
const FADED = "rgba(110,104,89,0.45)";
// Contenders: cooler/pastel hues, dashed, so #1 holders still lead the eye.
const CONTENDER_PALETTE = ["#9fa8da", "#80deea", "#c5e1a5", "#ffcc80", "#bcaaa4"];
const PALETTE = ["#e05a1f", "#ffff72", "#4fc3f7", "#81c784", "#ce93d8", "#ff8a65", "#f06292", "#4db6ac", "#fff176", "#90a4ae"];

const WhoWasOnePage = ({ initialPowerRanking = false, ...config }) => {
  const tournaments = useTournaments();
  const [view, setView] = useState("ranks");
  const [powerRanking, setPowerRanking] = useState(Boolean(initialPowerRanking));

  const { years, snapshots, reigns } = useMemo(
    () => computeWhoWasOne(tournaments, { ...config, powerRanking }),
    [tournaments, powerRanking, ...Object.values(config)]
  );

  const leaders = numberOnes(reigns);
  const chasers = contenders(snapshots, reigns).map((c) => c.player);
  const highlighted = [...leaders, ...chasers];
  const colorOf = (name) => {
    const i = leaders.indexOf(name);
    if (i >= 0) return PALETTE[i % PALETTE.length];
    const j = chasers.indexOf(name);
    return j >= 0 ? CONTENDER_PALETTE[j % CONTENDER_PALETTE.length] : FADED;
  };
  const styleOf = (name) =>
    leaders.includes(name)
      ? { borderWidth: 3, order: 0 }
      : chasers.includes(name)
      ? { borderWidth: 2, borderDash: [6, 4], order: 1 }
      : { borderWidth: 1, order: 2 };
  const labels = years.map((y) => `'${String(y).slice(2)}`);

  const rankData = useMemo(() => {
    const names = [...new Set(snapshots.flatMap((s) => s.top.map((p) => p.player)))];
    return {
      labels,
      datasets: names.map((name) => {
        const lead = leaders.includes(name);
        const chase = chasers.includes(name);
        const data = snapshots.map((s) => s.top.find((p) => p.player === name)?.rank ?? null);
        return {
          label: name,
          data,
          borderColor: colorOf(name),
          backgroundColor: colorOf(name),
          ...styleOf(name),
          pointRadius: data.map((r) => (r === 1 && lead ? 6 : lead || chase ? 3 : 0)),
          spanGaps: false,
        };
      }),
    };
  }, [snapshots, reigns]);

  const pointsData = useMemo(
    () => ({
      labels,
      datasets: highlighted.map((name) => ({
        label: name,
        data: snapshots.map((s) => s.top.find((p) => p.player === name)?.points ?? null),
        borderColor: colorOf(name),
        backgroundColor: colorOf(name),
        ...styleOf(name),
        pointRadius: 2,
      })),
    }),
    [snapshots, reigns]
  );

  const axis = { grid: { color: GRID }, ticks: { color: MUTED } };
  const rankOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: axis,
      y: { ...axis, reverse: true, min: 1, max: 8, ticks: { color: MUTED, stepSize: 1, callback: (v) => `#${v}` } },
    },
    plugins: {
      legend: { labels: { color: TEXT, usePointStyle: true, padding: 14, filter: (item) => highlighted.includes(item.text) } },
      tooltip: { callbacks: { label: (c) => `${c.dataset.label}: #${c.parsed.y}` } },
    },
  };
  const pointsOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: { x: axis, y: { ...axis, beginAtZero: true } },
    plugins: { legend: { labels: { color: TEXT, usePointStyle: true, padding: 14 } } },
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
          <button
            type="button"
            className={`plate${powerRanking ? " on" : ""}`}
            onClick={() => setPowerRanking(!powerRanking)}
            title="Only each player's best 25 events count"
          >
            <span className="led" />
            Power Ranking
          </button>
        </div>
        <Paper className="who-chart" style={{ background: BG }}>
          {years.length === 0 ? (
            <div className="rec-empty">Loading…</div>
          ) : (
            <div style={{ height: 460 }} data-testid={`who-chart-${view}`}>
              {view === "ranks" ? (
                <Line data={rankData} options={rankOptions} />
              ) : (
                <Line data={pointsData} options={pointsOptions} />
              )}
            </div>
          )}
          {years.length > 0 && (
            <div className="who-band" aria-label="#1 at each year end">
              {snapshots.map((s) => (
                <span
                  key={s.year}
                  className="who-band-cell"
                  title={`${s.year}: ${s.top[0]?.player ?? "-"}`}
                  style={{ background: colorOf(s.top[0]?.player) }}
                />
              ))}
            </div>
          )}
        </Paper>
        {chasers.length > 0 && (
          <p className="method-lede who-contenders">
            Dashed: closest players who never held #1 under this formula (sum over year-ends of
            9 − rank while in the top 8): {chasers.join(", ")}.
          </p>
        )}
        <ul className="who-reigns">
          {reigns.map((r) => (
            <li key={`${r.player}-${r.from}`}>
              <span className="who-dot" style={{ background: colorOf(r.player) }} />
              <strong>{r.player}</strong> {r.from === r.to ? r.from : `${r.from}–${r.to}`}
            </li>
          ))}
        </ul>
      </div>
    </Container>
  );
};

export default WhoWasOnePage;
