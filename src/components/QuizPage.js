import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Container, Paper, TextField } from "@mui/material";
import { useTournamentsStatus } from "../hooks/useTournaments";
import LoadState from "./LoadState";
import groupEvents from "../lib/groupEvents";
import gameLogos from "../lib/gameLogos";
import { buildProfiles, topPool, cluesFor, compareGuess, MAX_GUESSES } from "../lib/quiz";

// "/quiz" route (header tab). Guess the hidden player, one of the default
// top 100. One clue to start, one more per wrong guess (lib/quiz.js holds
// the order). Every guess row is compared with the answer: same main game,
// and whether the answer started later and has more titles / LAN events.
// Raw results only, like the events browser: the gear does not affect it.

const ARROW = { up: "▲", down: "▼", same: "=" };

const GuessBox = ({ players, taken, onGuess }) => {
  const [query, setQuery] = useState("");
  const wanted = query.trim().toLowerCase();
  const matches = wanted
    ? players.filter((p) => p.toLowerCase().includes(wanted) && !taken.has(p)).slice(0, 8)
    : [];
  return (
    <div className="filter-field search-field" style={{ position: "relative" }}>
      <span className="filter-label">Guess</span>
      <TextField
        size="small"
        placeholder="Type a top-100 player…"
        variant="outlined"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && matches.length) {
            onGuess(matches.find((m) => m.toLowerCase() === wanted) || matches[0]);
            setQuery("");
          }
        }}
        fullWidth
      />
      {matches.length > 0 && (
        <div className="search-results">
          {matches.map((p) => (
            <div
              key={p}
              className="search-result"
              onClick={() => {
                onGuess(p);
                setQuery("");
              }}
            >
              {p}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const Cell = ({ value, d, label }) => (
  <span className={`qz-cell ${d}`} title={label}>
    {value}
    <i>{ARROW[d]}</i>
  </span>
);

const ClueValue = ({ clue }) => (
  <span className="qz-text">
    {clue.key === "games" ? (
      clue.games.map((g, i) => (
        <span key={g} className={`qz-game${i === 0 ? " main" : ""}`}>
          {gameLogos[g] && <img src={gameLogos[g]} alt="" />}
          {g}
        </span>
      ))
    ) : (
      <>
        {clue.games && gameLogos[clue.games[0]] && <img src={gameLogos[clue.games[0]]} alt="" />}
        {clue.text}
      </>
    )}
  </span>
);

const QuizPage = () => {
  const { tournaments, loading, error } = useTournamentsStatus();
  const [round, setRound] = useState(() => Math.floor(Math.random() * 1e9));
  const [guesses, setGuesses] = useState([]);

  const world = useMemo(() => {
    if (!tournaments.length) return null;
    const profiles = buildProfiles(groupEvents(tournaments));
    const pool = topPool(tournaments).filter((n) => profiles.has(n));
    const sorted = [...pool].sort((x, y) => (x.toLowerCase() < y.toLowerCase() ? -1 : 1));
    return { profiles, pool, sorted };
  }, [tournaments]);

  if (loading || error || !world) {
    return (
      <Container disableGutters maxWidth={false}>
        <LoadState error={error} label="Hiding a player…" />
      </Container>
    );
  }

  const answer = world.pool[round % world.pool.length];
  const target = world.profiles.get(answer);
  const clues = cluesFor(target);
  const solved = guesses.includes(answer);
  const over = solved || guesses.length >= MAX_GUESSES;
  const shown = over ? clues.length : Math.min(clues.length, guesses.length + 1);

  const next = () => {
    setRound((r) => r + 1 + Math.floor(Math.random() * world.pool.length));
    setGuesses([]);
  };

  return (
    <Container disableGutters maxWidth={false}>
      <div className="qz-page">
        <h2 className="method-title">Quiz</h2>
        <p className="method-lede">
          A <b>top 100</b> player is hidden. Each wrong guess unlocks a clue. Arrows show if the
          answer started later <b>▲</b> or earlier <b>▼</b>, and has more <b>▲</b> or fewer{" "}
          <b>▼</b> titles and LAN events.
        </p>

        <Paper elevation={0} className={`game-section qz-card${solved ? " won" : ""}`}>
          <div className="qz-clues">
            {clues.map((c, i) =>
              i < shown ? (
                <div key={c.key} className="qz-clue">
                  <span className="filter-label">{c.label}</span>
                  <ClueValue clue={c} />
                </div>
              ) : (
                <div key={c.key} className="qz-clue locked">
                  <span className="filter-label">{c.label}</span>
                  <span className="qz-text">▒▒▒▒▒▒</span>
                </div>
              )
            )}
          </div>

          {!over && (
            <div className="qz-input">
              <GuessBox
                players={world.sorted}
                taken={new Set(guesses)}
                onGuess={(g) => setGuesses((gs) => (gs.includes(g) ? gs : [...gs, g]))}
              />
              <span className="qz-left">{MAX_GUESSES - guesses.length} left</span>
            </div>
          )}

          {guesses.length > 0 && (
            <div className="qz-table">
              <div className="qz-row qz-headrow">
                <span />
                <span>Game</span>
                <span>Start</span>
                <span>Titles</span>
                <span>LAN</span>
              </div>
              {guesses.map((g) => {
                const p = world.profiles.get(g);
                const c = compareGuess(p, target);
                return (
                  <div key={g} className={`qz-row${g === answer ? " hit" : ""}`}>
                    <span className="qz-gname">{g}</span>
                    <span className={`qz-cell ${c.game ? "same" : "miss"}`} title={p.mainGame}>
                      {gameLogos[p.mainGame] && <img src={gameLogos[p.mainGame]} alt={p.mainGame} />}
                    </span>
                    <Cell value={p.first} d={c.first} label="Answer started later ▲ / earlier ▼" />
                    <Cell value={p.titles} d={c.titles} label="Answer has more ▲ / fewer ▼ titles" />
                    <Cell value={p.lan} d={c.lan} label="Answer has more ▲ / fewer ▼ LAN events" />
                  </div>
                );
              })}
            </div>
          )}

          {over && (
            <div className="qz-end">
              <span className="qz-verdict">
                {solved ? `Found in ${guesses.length}.` : "Out of guesses. It was"}
              </span>
              <Link className="qz-name" to={`/players/${answer}`}>
                {answer}
              </Link>
              <button type="button" className="plate on" onClick={next}>
                <span className="led" />
                Again
              </button>
            </div>
          )}
        </Paper>
      </div>
    </Container>
  );
};

export default QuizPage;
