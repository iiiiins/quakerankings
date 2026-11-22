import React, { useEffect, useState } from "react";
import { Paper } from "@mui/material";
import useTournaments from "../hooks/useTournaments";
import { decodeShareParam, summarizeShareState } from "../lib/shareCodec";
import { prepare, findCrown, verifyCrown, idOf } from "../lib/crownSearch";

// Player-page Crown card: the simplest board setup that puts this player at
// #1, over every knob a share link carries (lib/crownSearch.js), opened as an
// ordinary v1 share link. Two answers:
//  - Simplest: anything goes (filters, zero weights).
//  - Strict:   every game, mode and year still counts and no weight is 0.
// Every link shown was re-checked with the real ranking. When the search
// finds nothing, the card says what was searched, never "impossible".

let cache = { rows: null, prep: null };
const prepFor = (rows) => {
  if (cache.rows !== rows) cache = { rows, prep: prepare(rows) };
  return cache.prep;
};

const answer = (rows, prep, name, opts) => {
  const { setup, searched } = findCrown(prep, name, opts);
  if (!setup) return { searched };
  const check = verifyCrown(rows, name, setup);
  return check.ok ? { param: check.param, searched } : { searched, unverified: true };
};

const Chips = ({ param }) => {
  const d = decodeShareParam(param);
  return (
    <div className="share-chips crown-chips">
      {summarizeShareState(d.config, d.filters).map((c) => (
        <span key={c} className="f-chip">
          {c}
        </span>
      ))}
    </div>
  );
};

const Route = ({ label, title, result }) => (
  <div className="crown-route" title={title}>
    <span className="filter-label">{label}</span>
    {result.param ? (
      <>
        <Chips param={result.param} />
        <a className="plate on crown-go" href={`#/?f=${result.param}`}>
          <span className="led" />
          Board
        </a>
      </>
    ) : (
      <span className="crown-none">none found</span>
    )}
  </div>
);

// Runs the search after the page has painted (it can take a moment for
// well-travelled players). -> null while searching, { missing }, or
// { simple, strict }
function useCrown(playerName) {
  const rows = useTournaments();
  const name = String(playerName || ""); // exact first, lowercase fallback (idOf)
  const [result, setResult] = useState(null);
  useEffect(() => {
    setResult(null);
    if (!rows.length || !name) return undefined;
    const timer = setTimeout(() => {
      const prep = prepFor(rows);
      if (idOf(prep, name) == null) return setResult({ missing: true });
      setResult({
        simple: answer(rows, prep, name, {}),
        strict: answer(rows, prep, name, { strict: true }),
      });
    }, 30);
    return () => clearTimeout(timer);
  }, [rows, name]);
  return result;
}

const CrownBody = ({ name, result }) => {
  const crowned = result?.simple?.param;
  if (!result) return <div className="crown-line">Searching for a board where {name} is #1…</div>;
  if (crowned === "v1") {
    return (
      <div className="crown-line">
        <b>{name}</b> is #1 on the default board.
      </div>
    );
  }
  if (crowned) {
    return (
      <>
        <div className="crown-line">
          The simplest boards where <b>{name}</b> is #1:
        </div>
        <Route label="Simplest" title="Any filter or weight, fewest changes" result={result.simple} />
        <Route
          label="Strict"
          title="Every game, mode and year still counts; no weight is 0"
          result={result.strict}
        />
      </>
    );
  }
  return (
    <div className="crown-line">
      No board found with <b>{name}</b> at #1. Searched{" "}
      <b>{result.simple.searched.cells.toLocaleString("en-US")}</b> setups of game, mode, years, LAN
      only and Power Ranking, each with the placement, tier, game or mode weights changed one group
      at a time. Two weight groups changed together were not tried.
    </div>
  );
};

const CrownCard = ({ playerName }) => {
  const name = String(playerName || "").toLowerCase();
  const result = useCrown(name);
  if (result?.missing) return null;
  const crowned = result?.simple?.param;
  return (
    <Paper elevation={0} className={`game-section crown-card${crowned ? " king" : ""}`}>
      <div className="crown-head">
        <span className="crown-mark">{crowned ? "♛" : "♔"}</span>
        <span className="filter-label">Crown</span>
      </div>
      <CrownBody name={name} result={result} />
    </Paper>
  );
};

export default CrownCard;
