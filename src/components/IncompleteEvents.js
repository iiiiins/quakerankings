import React from "react";
import { Link } from "react-router-dom";
import { Paper, Typography } from "@mui/material";
import useTournaments from "../hooks/useTournaments";
import { missingFields } from "../lib/computeRankings";

// Rows missing Game, Mode, Tier or Year cannot be scored, so computeRankings drops
// them and counts them as filtered. That keeps the board's tally honest but leaves
// the row invisible — and these are almost always a half-finished entry: placements
// typed in, tier or year forgotten. This lists exactly those rows so they can be
// found and completed. It shares missingFields with the scoring pipeline, so this
// list and the rows the board drops can never disagree.
const IncompleteEvents = () => {
  const tournaments = useTournaments();

  const broken = tournaments
    .map((t) => ({ tournament: t, missing: missingFields(t) }))
    .filter(({ missing }) => missing.length > 0);

  if (broken.length === 0) return null;

  return (
    <Paper elevation={0} className="game-section">
      <div className="game-section-head">
        <Typography component="h3" className="game-section-title">
          Needs fixing ({broken.length})
        </Typography>
      </div>
      <Typography component="p" className="admin-hint">
        These rows are missing something the scoring needs, so they are counted as
        filtered and score nobody. Fill in the gap in the{" "}
        <Link to="/events">events browser</Link> and they will start counting.
      </Typography>
      <ul className="incomplete-list">
        {broken.map(({ tournament, missing }) => (
          <li key={tournament.id}>
            <strong>
              {tournament.Event_Name || `Event #${tournament.id}`}
            </strong>
            {tournament.Year ? ` (${tournament.Year})` : ""} — missing{" "}
            {missing.join(", ")}
          </li>
        ))}
      </ul>
    </Paper>
  );
};

export default IncompleteEvents;
