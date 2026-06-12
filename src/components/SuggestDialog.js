import React, { useState } from "react";
import { Dialog, Typography, Button, TextField } from "@mui/material";
import TournamentForm from "./TournamentForm";
import { submitSuggestion, NOTE_MAX, HANDLE_MAX } from "../services/submissions";
import tournamentRules from "../lib/tournamentRules";

const { PLACEMENTS } = tournamentRules;

const rowSummary = (row) =>
  PLACEMENTS.filter((p) => row[p])
    .map((p) => `${p} ${row[p]}`)
    .join(" · ") || "no placements";

// Public "suggest a fix / submit a tournament" surface. target is a grouped
// event from the browser (correction — team events pick a raw row first, the
// same pattern as the admin editor) or the string "new" (a brand-new
// tournament). Everything lands in the Submissions review queue; nothing
// touches Tournaments until the admin approves it.
const SuggestDialog = ({ target, onClose }) => {
  const isNew = target === "new";
  const rows = (!isNew && target?.rows) || [];
  const single = rows.length === 1;
  const [selectedRowId, setSelectedRowId] = useState(null);
  const [note, setNote] = useState("");
  const [handle, setHandle] = useState("");
  const [website, setWebsite] = useState(""); // honeypot — humans never see the field
  const [done, setDone] = useState(false);

  const selectedRow = single
    ? rows[0]
    : rows.find((r) => r.id === selectedRowId) || null;

  const closeAll = () => {
    setSelectedRowId(null);
    setNote("");
    setHandle("");
    setWebsite("");
    setDone(false);
    onClose();
  };

  const handleSuggest = async (row) => {
    const result = await submitSuggestion({
      type: isNew ? "new" : "correction",
      targetId: isNew ? null : selectedRow.id,
      payload: row,
      note,
      handle,
      website,
    });
    if (result.error) return result; // TournamentForm renders the message
    setDone(true);
    return {};
  };

  const extraFields = (
    <>
      <div className="tfield f-span">
        <span className="filter-label">Note for the reviewer (optional)</span>
        <TextField
          size="small"
          multiline
          minRows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          inputProps={{ maxLength: NOTE_MAX }}
          placeholder="What's wrong? A source link helps."
          fullWidth
        />
      </div>
      <div className="tfield">
        <span className="filter-label">Your handle (optional)</span>
        <TextField
          size="small"
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          inputProps={{ maxLength: HANDLE_MAX }}
          fullWidth
        />
      </div>
      <label className="hp-trap" aria-hidden="true">
        Website
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </label>
    </>
  );

  return (
    <Dialog open={Boolean(target)} onClose={closeAll} maxWidth="md" fullWidth>
      {target && (
        <div className="ev-edit">
          <Typography component="h3" className="game-section-title ev-edit-title">
            {isNew
              ? "Submit a tournament"
              : `Suggest a fix — ${target.name} (${target.year})`}
          </Typography>

          {done ? (
            <>
              <p className="ev-edit-hint">
                Thanks — your suggestion is in the review queue. It shows up on
                the site once it's approved.
              </p>
              <div className="tform-actions">
                <Button variant="contained" color="primary" onClick={closeAll}>
                  Close
                </Button>
              </div>
            </>
          ) : isNew ? (
            <>
              <p className="ev-edit-hint">
                Know a tournament that's missing? Fill it in — it goes to a
                review queue and is added once approved.
              </p>
              <TournamentForm
                submitLabel="Submit suggestion"
                onSubmit={handleSuggest}
                onCancel={closeAll}
              >
                {extraFields}
              </TournamentForm>
            </>
          ) : selectedRow ? (
            <>
              {!single && (
                <button
                  type="button"
                  className="ev-back"
                  onClick={() => setSelectedRowId(null)}
                >
                  ← all rows
                </button>
              )}
              <p className="ev-edit-hint">
                Change what's wrong and submit — your fix goes to a review
                queue and is applied once approved.
              </p>
              <TournamentForm
                key={selectedRow.id}
                initialRow={selectedRow}
                submitLabel="Submit fix"
                onSubmit={handleSuggest}
                onCancel={closeAll}
              >
                {extraFields}
              </TournamentForm>
            </>
          ) : (
            <>
              <p className="ev-edit-hint">
                Team event — {rows.length} rows under this event. Pick the one
                that needs fixing:
              </p>
              <div className="ev-rows-list">
                {rows.map((r) => (
                  <div key={r.id} className="ev-row-item">
                    <span className="ev-row-id">#{r.id}</span>
                    <span className="ev-row-sum">{rowSummary(r)}</span>
                    <Button
                      size="small"
                      variant="text"
                      className="tab-idle"
                      onClick={() => setSelectedRowId(r.id)}
                    >
                      Fix this
                    </Button>
                  </div>
                ))}
              </div>
              <div className="tform-actions">
                <Button variant="text" className="tab-idle" onClick={closeAll}>
                  Cancel
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </Dialog>
  );
};

export default SuggestDialog;
