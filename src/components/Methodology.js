import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { Container, Paper, Typography } from "@mui/material";
import useTournaments from "../hooks/useTournaments";
import groupEvents from "../lib/groupEvents";

// Static "how the ranking works" page. The numbers shown are the formula
// DEFAULTS — the text points at the settings gear for the user's own values.
const Methodology = () => {
  const tournamentList = useTournaments();
  const eventCount = useMemo(
    () => groupEvents(tournamentList).length,
    [tournamentList]
  );
  const resultCount = tournamentList.length;
  const fmt = (n) => (n > 0 ? n.toLocaleString("en-US") : "—");

  return (
    <Container disableGutters maxWidth={false}>
      <div className="method-page">
        <h2 className="method-title">How the ranking works</h2>
        <p className="method-lede">
          Placements in, opinion out. Every recorded top-8 finish across three
          decades of competitive Quake feeds one points formula — and the
          formula is yours to tune. Open the settings gear, reweight anything,
          and the whole ranking recomputes live. Your formula is saved in your
          browser.
        </p>

        <Paper elevation={0} className="game-section">
          <div className="game-section-head">
            <Typography component="h3" className="game-section-title">
              The formula
            </Typography>
          </div>
          <div className="method-formula">
            points = placement base × tier weight × game weight × mode weight
          </div>
          <p>
            A player's score is the sum of points over every tournament where
            they placed top-8. No decay, no votes, no eye test. Default
            placement bases: <b>1st 100</b> · <b>2nd 50</b> · <b>Top 4 25</b> ·{" "}
            <b>Top 8 10</b>. Default tier weights: <b>T1 100%</b> ·{" "}
            <b>T2 60%</b> · <b>T3 35%</b> · <b>T4 20%</b> · <b>T5 10%</b>. Game
            and mode weights all start at 100% — boost what you rate, zero out
            what you don't count.
          </p>
        </Paper>

        <Paper elevation={0} className="game-section">
          <div className="game-section-head">
            <Typography component="h3" className="game-section-title">
              Tiers — the hand-made part
            </Typography>
          </div>
          <p>
            Every tournament carries a tier from <b>1 (major)</b> to{" "}
            <b>5 (minor)</b>, assigned by hand from three inputs:{" "}
            <b>prize pool</b>, <b>era</b> (a $5,000 LAN meant something
            different in 1997 than in 2017), and <b>competitiveness</b> — who
            showed up and how deep the bracket ran.
          </p>
          <p>
            Why isn't prize money in the formula directly? Because the tier
            already prices it in — weighting it again would count the same
            dollars twice. Prize pools are shown in the{" "}
            <Link to="/events">tournament browser</Link> as context, not as
            score.
          </p>
        </Paper>

        <Paper elevation={0} className="game-section">
          <div className="game-section-head">
            <Typography component="h3" className="game-section-title">
              Placement buckets
            </Typography>
          </div>
          <p>
            Results score in four buckets: <b>1st</b>, <b>2nd</b>, <b>Top 4</b>,{" "}
            <b>Top 8</b>. Quake brackets historically rarely played out
            3rd-place deciders or 5th–8th placements, so 3rd–4th score the
            same, as do 5th–8th. In team modes, every rostered player on a
            placing team receives the placement.
          </p>
        </Paper>

        <Paper elevation={0} className="game-section">
          <div className="game-section-head">
            <Typography component="h3" className="game-section-title">
              Filters &amp; extras
            </Typography>
          </div>
          <ul>
            <li>
              <b>LAN Only</b> — drop online results.
            </li>
            <li>
              <b>Power Ranking</b> — each player keeps only their best 25
              events: peak strength instead of longevity.
            </li>
            <li>
              <b>Pts/Event</b> — career average points, shown from 15 events
              (threshold adjustable in settings); fewer events show a dash.
            </li>
            <li>
              <b>Game / mode / tier weights</b> — reweight them in the settings
              gear, or untick one to remove it from scoring entirely.
            </li>
          </ul>
        </Paper>

        <Paper elevation={0} className="game-section">
          <div className="game-section-head">
            <Typography component="h3" className="game-section-title">
              The data
            </Typography>
          </div>
          <p>
            <b>{fmt(resultCount)}</b> recorded results across{" "}
            <b>{fmt(eventCount)}</b> events and seven games — Quake World,
            Quake 2, Quake 3, Quake 4, Quake Live, Quake Champions and
            Diabotical, 1996 to today — maintained by hand. Browse all of it in
            the <Link to="/events">tournament browser</Link>.
          </p>
          <p>
            Spot a missing event or a wrong result? Tell me — discord{" "}
            <b>@ theamazingins</b>.
          </p>
        </Paper>
      </div>
    </Container>
  );
};

export default Methodology;
