import React, { useEffect, useState } from "react";
import { Paper, Typography, Button } from "@mui/material";
import useTournaments, { refreshTournaments } from "../hooks/useTournaments";
import {
  fetchPendingSubmissions,
  setSubmissionStatus,
  rowFromPayload,
} from "../services/submissions";
import { insertTournament, updateTournament } from "../services/tournamentWrites";
import tournamentRules from "../lib/tournamentRules";

const { PLACEMENTS, validateRow } = tournamentRules;

const FIELDS = [
  "Event_Name",
  "Game",
  "Mode",
  "Tier",
  "Year",
  "LAN",
  "Prizepool",
].concat(PLACEMENTS);

const FIELD_LABELS = { Event_Name: "Event", LAN: "Setting", Prizepool: "Prize" };
const fieldLabel = (f) => FIELD_LABELS[f] || f;

// All payload-derived values go through String coercion — payloads come in
// through an endpoint open to anon, so nothing from them is rendered raw.
const fmt = (f, v) => {
  if (f === "LAN") return v ? "LAN" : "Online";
  if (v === null || v === undefined || v === "") return "—";
  return String(v);
};

const diffFields = (current, proposed) =>
  FIELDS.filter((f) => (current[f] ?? null) !== (proposed[f] ?? null));

const placementsSummary = (row) =>
  PLACEMENTS.filter((p) => row[p])
    .map((p) => `${p} ${row[p]}`)
    .join(" · ") || "no placements";

const errText = (error) =>
  error?.message ||
  (typeof error === "string" ? error : `Request failed — ${JSON.stringify(error)}`);

// The /admin review queue: pending submissions, oldest first. Corrections
// render as a diff against the LIVE row (what approving would change today,
// not what the submitter saw). Approve applies through tournamentWrites with
// the admin session, then marks the submission; reject just marks it.
const SubmissionQueue = () => {
  const [subs, setSubs] = useState(null); // null = loading
  const [loadError, setLoadError] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [itemErrors, setItemErrors] = useState({});
  const tournamentList = useTournaments();

  useEffect(() => {
    fetchPendingSubmissions().then((res) => {
      if (res.error) setLoadError(errText(res.error));
      else setSubs(res.submissions);
    });
  }, []);

  const setItemError = (id, message) =>
    setItemErrors((e) => ({ ...e, [id]: message }));

  const approve = async (s, row) => {
    setBusyId(s.id);
    setItemError(s.id, null);
    const applied =
      s.type === "correction"
        ? await updateTournament(s.target_id, row)
        : await insertTournament(row);
    if (applied.error) {
      setItemError(s.id, errText(applied.error));
      setBusyId(null);
      return;
    }
    const marked = await setSubmissionStatus(s.id, "approved");
    setBusyId(null);
    if (marked.error) {
      // The tournament write landed but the submission is still pending —
      // approving again would double-apply (duplicate insert for "new").
      setItemError(
        s.id,
        `Applied to Tournaments, but marking approved failed (${errText(
          marked.error
        )}). Do NOT approve again — fix the status in Supabase.`
      );
      refreshTournaments();
      return;
    }
    refreshTournaments();
    setSubs((list) => list.filter((x) => x.id !== s.id));
  };

  const reject = async (s) => {
    setBusyId(s.id);
    setItemError(s.id, null);
    const marked = await setSubmissionStatus(s.id, "rejected");
    setBusyId(null);
    if (marked.error) {
      setItemError(s.id, errText(marked.error));
      return;
    }
    setSubs((list) => list.filter((x) => x.id !== s.id));
  };

  return (
    <Paper elevation={0} className="game-section">
      <div className="game-section-head">
        <Typography component="h3" className="game-section-title">
          Review queue
          {subs && subs.length > 0 ? ` (${subs.length})` : ""}
        </Typography>
      </div>
      {loadError ? (
        <div className="admin-error">{loadError}</div>
      ) : subs === null ? (
        <p className="sub-empty">Loading…</p>
      ) : subs.length === 0 ? (
        <p className="sub-empty">No pending submissions.</p>
      ) : (
        <div className="sub-list">
          {subs.map((s) => {
            const row = rowFromPayload(s.payload);
            const errs = validateRow(row);
            const isFix = s.type === "correction";
            const target = isFix
              ? tournamentList.find((t) => t.id === s.target_id)
              : null;
            const targetMissing = isFix && !target;
            const diffs = isFix && target ? diffFields(target, row) : [];
            const canApprove = errs.length === 0 && !targetMissing;
            const date = s.created_at
              ? new Date(s.created_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })
              : "";

            return (
              <div key={s.id} className="sub-item">
                <div className="sub-head">
                  <span className={`sub-type ${isFix ? "fix" : "new"}`}>
                    {isFix ? "FIX" : "NEW"}
                  </span>
                  <span className="sub-title">
                    {`${row.Event_Name || "(unnamed)"} — ${fmt("Year", row.Year)} · ${fmt(
                      "Game",
                      row.Game
                    )} · ${fmt("Mode", row.Mode)}`}
                  </span>
                  <span className="sub-meta">
                    {`#${s.id} · ${date}${s.handle ? ` · by ${s.handle}` : ""}`}
                  </span>
                </div>

                {s.note && <p className="sub-note">“{s.note}”</p>}

                {isFix ? (
                  targetMissing ? (
                    <p className="sub-warn">
                      Target row #{String(s.target_id)} no longer exists — the
                      event was edited or deleted after this was submitted.
                    </p>
                  ) : diffs.length === 0 ? (
                    <p className="sub-same">
                      No differences vs the current row (#{target.id}).
                    </p>
                  ) : (
                    <div className="sub-diff">
                      {diffs.map((f) => (
                        <div key={f} className="diff-line">
                          <span className="diff-field">{fieldLabel(f)}</span>
                          <span className="diff-old">{fmt(f, target[f])}</span>
                          <span className="diff-arrow">→</span>
                          <span className="diff-new">{fmt(f, row[f])}</span>
                        </div>
                      ))}
                    </div>
                  )
                ) : (
                  <p className="sub-summary">
                    {`Tier ${fmt("Tier", row.Tier)} · ${row.LAN ? "LAN" : "Online"}${
                      row.Prizepool != null
                        ? ` · $${Number(row.Prizepool).toLocaleString("en-US")}`
                        : ""
                    } · ${placementsSummary(row)}`}
                  </p>
                )}

                {errs.length > 0 && (
                  <div className="admin-error">
                    {`Payload fails validation: ${errs.join("; ")}`}
                  </div>
                )}
                {itemErrors[s.id] && (
                  <div className="admin-error">{itemErrors[s.id]}</div>
                )}

                <div className="tform-actions">
                  <Button
                    variant="contained"
                    color="primary"
                    disabled={busyId !== null || !canApprove}
                    onClick={() => approve(s, row)}
                  >
                    Approve
                  </Button>
                  <Button
                    variant="text"
                    className="tab-idle btn-danger"
                    disabled={busyId !== null}
                    onClick={() => reject(s)}
                  >
                    Reject
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Paper>
  );
};

export default SubmissionQueue;
