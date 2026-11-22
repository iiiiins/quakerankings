import React, { useMemo, useState } from "react";
import { Paper, Typography, Button, TextField } from "@mui/material";
import useTournaments, { refreshTournaments } from "../hooks/useTournaments";
import { updateTournament } from "../services/tournamentWrites";
import {
  findDuplicates,
  oddNames,
  planRename,
  applyPlan,
  cleanName,
  pairKey,
  loadDismissed,
  saveDismissed,
} from "../lib/duplicates";

// window.localStorage itself can throw (blocked storage); the lib guards the rest
const storage = () => {
  try {
    return window.localStorage;
  } catch (e) {
    return null;
  }
};

// /admin Duplicates section: likely pairs (one player under two names) with
// their evidence, strongest first, plus names that break the data's rules.
// Every fix is a rename of one name into another, row by row, through
// tournamentWrites with the admin session (RLS is the gate). The admin
// always sees the full row list before confirming. dryRun swaps the writer
// for one that writes nothing (dev preview, see AdminPage).

const RULE_WORD = {
  case: "Capitals",
  symbols: "Symbols",
  leet: "Number letters",
  affix: "Extra x or digits",
  lookalike: "One letter apart",
};

const noWrite = async () => ({});

const Side = ({ s }) => (
  <span>
    <b>{s.name}</b> {s.events} events · {s.years} · {s.games.join(", ")}
  </span>
);

// preview of a rename plan + confirm; the plan is rebuilt from live rows
const Preview = ({ rows, from, to, dryRun, onDone, onCancel }) => {
  const plan = useMemo(() => planRename(rows, from, to), [rows, from, to]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const run = async () => {
    setBusy(true);
    const res = await applyPlan(plan, dryRun ? noWrite : updateTournament);
    setBusy(false);
    setResult(res);
    if (!dryRun && res.done.length) refreshTournaments();
    if (!res.failed) onDone(res.done.length);
  };

  return (
    <div className="dup-preview">
      <div className="sub-summary">
        {plan.changes.length} {plan.changes.length === 1 ? "row changes" : "rows change"}:{" "}
        <b>{from}</b> becomes <b>{plan.to || "…"}</b>
      </div>
      <div className="sub-diff">
        {plan.changes.map((c) => (
          <div key={c.id} className="diff-line">
            <span className="diff-field">#{c.id}</span>
            <span className="dup-event">
              {c.event} ({c.year}) · {c.slots.join(", ")}
            </span>
            <span className="diff-old">{from}</span>
            <span className="diff-arrow">→</span>
            <span className="diff-new">{plan.to}</span>
          </div>
        ))}
      </div>
      {plan.conflicts.length > 0 && (
        <div className="sub-warn">
          Blocked: row {plan.conflicts.map((c) => `#${c.id}`).join(", ")} already has {plan.to}.
        </div>
      )}
      {result?.failed && (
        <div className="sub-warn">
          Stopped at row #{result.failed.id}: {result.failed.message}. {result.done.length} rows were
          changed before that.
        </div>
      )}
      <div className="tform-actions">
        <Button
          variant="contained"
          color="primary"
          disabled={busy || !plan.to || !plan.changes.length || plan.conflicts.length > 0}
          onClick={run}
        >
          {dryRun ? "Dry run" : "Confirm"} {plan.changes.length} {plan.changes.length === 1 ? "row" : "rows"}
        </Button>
        <Button variant="text" className="tab-idle" disabled={busy} onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
};

const PairItem = ({ pair, rows, dryRun, onMerged, onDismiss }) => {
  const [open, setOpen] = useState(false);
  // default: keep the name with more events
  const [keep, setKeep] = useState(pair.a.events >= pair.b.events ? pair.a.name : pair.b.name);
  const drop = keep === pair.a.name ? pair.b.name : pair.a.name;
  return (
    <div className={`sub-item dup-item${pair.strong ? " strong" : ""}`}>
      <div className="sub-head">
        <span className={`sub-type ${pair.strong ? "new" : "fix"}`}>{pair.strong ? "STRONG" : "MAYBE"}</span>
        <span className="sub-title">
          {pair.a.name} / {pair.b.name}
        </span>
        <span className="sub-meta">
          {RULE_WORD[pair.rule]} · {pair.sharedRivals} shared rivals ({Math.round(pair.overlap * 100)}%)
        </span>
      </div>
      <div className="sub-summary dup-sides">
        <Side s={pair.a} />
        <Side s={pair.b} />
      </div>
      {!open ? (
        <div className="tform-actions">
          <Button variant="outlined" color="primary" onClick={() => setOpen(true)}>
            Merge
          </Button>
          <Button variant="text" className="tab-idle" onClick={() => onDismiss(pair)}>
            Not the same player
          </Button>
        </div>
      ) : (
        <>
          <div className="dup-keep">
            <span className="filter-label">Keep</span>
            {[pair.a.name, pair.b.name].map((n) => (
              <button
                key={n}
                type="button"
                className={`plate${keep === n ? " on" : ""}`}
                onClick={() => setKeep(n)}
              >
                <span className="led" />
                {n}
              </button>
            ))}
          </div>
          <Preview
            rows={rows}
            from={drop}
            to={keep}
            dryRun={dryRun}
            onCancel={() => setOpen(false)}
            onDone={(n) => {
              setOpen(false);
              onMerged(`${drop} merged into ${cleanName(keep)}: ${n} rows${dryRun ? " (dry run, nothing written)" : ""}.`);
            }}
          />
        </>
      )}
    </div>
  );
};

const OddItem = ({ odd, rows, dryRun, onMerged }) => {
  const [open, setOpen] = useState(false);
  const [to, setTo] = useState(cleanName(odd.name));
  return (
    <div className="sub-item dup-item">
      <div className="sub-head">
        <span className="sub-type fix">FIX</span>
        <span className="sub-title">{JSON.stringify(odd.name)}</span>
        <span className="sub-meta">
          {odd.why} · row {odd.rowIds.map((i) => `#${i}`).join(", ")}
        </span>
      </div>
      {!open ? (
        <div className="tform-actions">
          <Button variant="outlined" color="primary" onClick={() => setOpen(true)}>
            Rename
          </Button>
        </div>
      ) : (
        <>
          <div className="dup-keep">
            <span className="filter-label">New name</span>
            <TextField size="small" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <Preview
            rows={rows}
            from={odd.name}
            to={to}
            dryRun={dryRun}
            onCancel={() => setOpen(false)}
            onDone={(n) => {
              setOpen(false);
              onMerged(`${odd.name} renamed to ${cleanName(to)}: ${n} rows${dryRun ? " (dry run, nothing written)" : ""}.`);
            }}
          />
        </>
      )}
    </div>
  );
};

const DuplicatesPanel = ({ dryRun = false }) => {
  const rows = useTournaments();
  const [showAll, setShowAll] = useState(false);
  const [last, setLast] = useState(null);
  const [dismissed, setDismissed] = useState(() => loadDismissed(storage()));
  const [showHidden, setShowHidden] = useState(false);
  const pairs = useMemo(() => findDuplicates(rows), [rows]);
  const odd = useMemo(() => oddNames(rows), [rows]);
  const shown = pairs.filter((p) => !dismissed.has(pairKey(p)));
  const hidden = pairs.filter((p) => dismissed.has(pairKey(p)));
  const strong = shown.filter((p) => p.strong);
  const weak = shown.filter((p) => !p.strong);
  const key = pairKey;

  const setPair = (pair, hide) => {
    const next = new Set(dismissed);
    if (hide) next.add(pairKey(pair));
    else next.delete(pairKey(pair));
    saveDismissed(storage(), next);
    setDismissed(next);
  };
  const onDismiss = (pair) => setPair(pair, true);

  return (
    <Paper elevation={0} className="game-section dup-panel">
      <div className="game-section-head">
        <Typography component="h3" className="game-section-title">
          Duplicates
        </Typography>
        <span className="game-section-points">
          {strong.length} strong · {weak.length} maybe · {odd.length} odd
        </span>
      </div>
      {dryRun && <div className="admin-warn">Dry run: buttons show the plan and write nothing.</div>}
      <p className="sub-summary">
        Name pairs that never played the same event. Strong means both names have 2+ events and
        share 5+ rivals, at least 30% of the smaller name's rivals. Merge renames the dropped name in
        every row; you see each row first.
      </p>
      {last && <div className="admin-success">{last}</div>}
      {hidden.length > 0 && (
        <div className="dup-hidden">
          <button type="button" className="dup-link" onClick={() => setShowHidden(!showHidden)}>
            {hidden.length} hidden, {showHidden ? "close" : "show"}
          </button>
          {showHidden &&
            hidden.map((p) => (
              <div key={key(p)} className="dup-hidden-row">
                <span>
                  {p.a.name} / {p.b.name}
                </span>
                <button type="button" className="dup-link" onClick={() => setPair(p, false)}>
                  Restore
                </button>
              </div>
            ))}
        </div>
      )}

      <div className="sub-list">
        {strong.map((p) => (
          <PairItem key={key(p)} pair={p} rows={rows} dryRun={dryRun} onMerged={setLast} onDismiss={onDismiss} />
        ))}
      </div>

      {odd.length > 0 && (
        <div className="sub-list">
          {odd.map((o) => (
            <OddItem key={o.name} odd={o} rows={rows} dryRun={dryRun} onMerged={setLast} />
          ))}
        </div>
      )}

      {weak.length > 0 && (
        <>
          <button type="button" className={`plate${showAll ? " on" : ""}`} onClick={() => setShowAll(!showAll)}>
            <span className="led" />
            {showAll ? "Hide" : "Show"} {weak.length} maybe
          </button>
          {showAll && (
            <div className="sub-list dup-weak">
              {weak.map((p) => (
                <PairItem key={key(p)} pair={p} rows={rows} dryRun={dryRun} onMerged={setLast} onDismiss={onDismiss} />
              ))}
            </div>
          )}
        </>
      )}
    </Paper>
  );
};

export default DuplicatesPanel;
