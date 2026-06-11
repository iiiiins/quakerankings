import React, { useState } from "react";
import { Dialog, Typography, Button } from "@mui/material";
import TournamentForm from "./TournamentForm";
import {
  insertTournament,
  updateTournament,
  deleteTournament,
} from "../services/tournamentWrites";
import { refreshTournaments } from "../hooks/useTournaments";
import tournamentRules from "../lib/tournamentRules";

const { PLACEMENTS } = tournamentRules;

const rowSummary = (row) =>
  PLACEMENTS.filter((p) => row[p])
    .map((p) => `${p} ${row[p]}`)
    .join(" · ") || "no placements";

// Edit surface for one grouped event. Single-row events open the form
// directly; team events show a row picker first (the editor edits raw DB
// rows — the browser merely groups them). Every successful write refreshes
// the shared tournament cache and closes the dialog.
const EventEditDialog = ({ event, onClose }) => {
  const [selectedRowId, setSelectedRowId] = useState(null);
  const [addingRow, setAddingRow] = useState(false);

  const rows = event?.rows || [];
  const single = rows.length === 1;
  const selectedRow = single
    ? rows[0]
    : rows.find((r) => r.id === selectedRowId) || null;

  const closeAll = () => {
    setSelectedRowId(null);
    setAddingRow(false);
    onClose();
  };

  const afterWrite = (result) => {
    if (!result.error) {
      refreshTournaments();
      closeAll();
    }
    return result;
  };

  const handleUpdate = (id) => async (row) =>
    afterWrite(await updateTournament(id, row));
  const handleDelete = (id) => async () =>
    afterWrite(await deleteTournament(id));
  const handleAddRow = async (row) => afterWrite(await insertTournament(row));

  return (
    <Dialog open={Boolean(event)} onClose={closeAll} maxWidth="md" fullWidth>
      {event && (
        <div className="ev-edit">
          <Typography component="h3" className="game-section-title ev-edit-title">
            {event.name} — {event.year} · {event.game} · {event.mode}
          </Typography>

          {selectedRow ? (
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
              <TournamentForm
                key={selectedRow.id}
                initialRow={selectedRow}
                submitLabel="Save changes"
                onSubmit={handleUpdate(selectedRow.id)}
                onDelete={handleDelete(selectedRow.id)}
                onCancel={closeAll}
              />
            </>
          ) : addingRow ? (
            <>
              <button
                type="button"
                className="ev-back"
                onClick={() => setAddingRow(false)}
              >
                ← all rows
              </button>
              <TournamentForm
                prefill={{
                  Event_Name: event.name,
                  Game: event.game,
                  Mode: event.mode,
                  Tier: event.tier,
                  Year: event.year,
                  LAN: event.lan,
                  Prizepool: event.prizepool,
                }}
                dupCheck={false}
                submitLabel="Add row"
                onSubmit={handleAddRow}
                onCancel={() => setAddingRow(false)}
              />
            </>
          ) : (
            <>
              <p className="ev-edit-hint">
                Team event — {rows.length} rows under this key. Pick one to
                edit:
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
                      Edit
                    </Button>
                  </div>
                ))}
              </div>
              <div className="tform-actions">
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => setAddingRow(true)}
                >
                  Add row to this event
                </Button>
                <Button variant="text" className="tab-idle" onClick={closeAll}>
                  Close
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </Dialog>
  );
};

export default EventEditDialog;
