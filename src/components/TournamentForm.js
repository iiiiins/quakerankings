import React, { useState } from "react";
import { TextField, Button, FormControl, Select, MenuItem } from "@mui/material";
// Default-import + destructure: the rules module is CommonJS (shared with the
// node import script) and CRA's strictExportPresence rejects named imports
// from CJS — the default-interop object is the supported path.
import tournamentRules from "../lib/tournamentRules";
import useTournaments from "../hooks/useTournaments";

const { GAMES, MODES, PLACEMENTS, validateRow, normalizeRow } = tournamentRules;

// One form for both add and edit. Field state stays as typed (strings for free
// inputs); buildRow coerces like the import script — unconvertible values pass
// through raw so validateRow's errors show what was typed.
const num = (s) => (s !== "" && !isNaN(Number(s)) ? Number(s) : s);

// Supabase errors aren't guaranteed a .message (e.g. a bare "{}" body) —
// String() on those renders "[object Object]".
const errText = (error) =>
  error?.message ||
  (typeof error === "string" ? error : `Request failed — ${JSON.stringify(error)}`);

const PLACEMENT_TINTS = {
  "1st": "pm-g",
  "2nd": "pm-s",
  "3rd": "pm-b",
  "4th": "pm-b",
  "5th": "pm-c",
  "6th": "pm-c",
  "7th": "pm-c",
  "8th": "pm-c",
};

const emptyFields = () => ({
  Event_Name: "",
  Game: "Quake Champions",
  Mode: "Duel",
  Tier: 3,
  Year: String(new Date().getFullYear()),
  LAN: false,
  Prizepool: "",
  ...Object.fromEntries(PLACEMENTS.map((p) => [p, ""])),
});

const fieldsFromRow = (row) => ({
  Event_Name: row.Event_Name || "",
  Game: row.Game,
  Mode: row.Mode,
  Tier: row.Tier,
  Year: String(row.Year ?? ""),
  LAN: Boolean(row.LAN),
  Prizepool: row.Prizepool == null ? "" : String(row.Prizepool),
  ...Object.fromEntries(PLACEMENTS.map((p) => [p, row[p] || ""])),
});

const TournamentForm = ({
  initialRow = null, // edit mode: the raw DB row being changed
  prefill = null, // add mode with prefilled fields (add-row-to-event)
  dupCheck = true,
  submitLabel = "Save",
  onSubmit,
  onDelete,
  onCancel,
  children = null, // extra grid fields (suggest mode: note/handle/honeypot)
}) => {
  const isEdit = Boolean(initialRow);
  const [fields, setFields] = useState(() =>
    isEdit
      ? fieldsFromRow(initialRow)
      : prefill
      ? fieldsFromRow(prefill)
      : emptyFields()
  );
  const [errors, setErrors] = useState([]);
  const [dupWarned, setDupWarned] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const tournamentList = useTournaments();

  const setField = (key, value) => {
    setFields((f) => ({ ...f, [key]: value }));
    setDupWarned(false);
    setConfirmingDelete(false);
  };

  const buildRow = () =>
    normalizeRow({
      Event_Name: fields.Event_Name,
      Game: fields.Game,
      Mode: fields.Mode,
      Tier: fields.Tier,
      Year: num(fields.Year.trim()),
      LAN: fields.LAN,
      Prizepool: fields.Prizepool.trim() === "" ? null : num(fields.Prizepool.trim()),
      ...Object.fromEntries(PLACEMENTS.map((p) => [p, fields[p]])),
    });

  const handleSubmit = async (event) => {
    event.preventDefault();
    const row = buildRow();
    const errs = validateRow(row);
    setErrors(errs);
    if (errs.length) return;

    // Soft duplicate guard on add — warn once, second submit proceeds
    // (legitimately repeated keys exist: multi-row team events).
    if (!isEdit && dupCheck && !dupWarned) {
      const dup = Object.values(tournamentList || {}).some(
        (t) =>
          (t.Event_Name || "").trim().toLowerCase() === row.Event_Name.toLowerCase() &&
          t.Year === row.Year &&
          t.Game === row.Game &&
          t.Mode === row.Mode
      );
      if (dup) {
        setDupWarned(true);
        return;
      }
    }

    setBusy(true);
    const result = (await onSubmit(row)) || {};
    setBusy(false);
    if (result.error) {
      setErrors([errText(result.error)]);
      return;
    }
    if (!isEdit) setFields(emptyFields());
    setDupWarned(false);
  };

  const handleDelete = async () => {
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    setBusy(true);
    const result = (await onDelete()) || {};
    setBusy(false);
    if (result.error) {
      setErrors([errText(result.error)]);
      setConfirmingDelete(false);
    }
  };

  return (
    <form className="tform" onSubmit={handleSubmit}>
      <div className="tfield f-name">
        <span className="filter-label">Event name</span>
        <TextField
          size="small"
          value={fields.Event_Name}
          onChange={(e) => setField("Event_Name", e.target.value)}
          fullWidth
        />
      </div>
      <div className="tfield">
        <span className="filter-label">Game</span>
        <FormControl size="small" fullWidth>
          <Select value={fields.Game} onChange={(e) => setField("Game", e.target.value)}>
            {GAMES.map((game) => (
              <MenuItem key={game} value={game}>
                {game}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </div>
      <div className="tfield">
        <span className="filter-label">Mode</span>
        <FormControl size="small" fullWidth>
          <Select value={fields.Mode} onChange={(e) => setField("Mode", e.target.value)}>
            {MODES.map((mode) => (
              <MenuItem key={mode} value={mode}>
                {mode}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </div>
      <div className="tfield">
        <span className="filter-label">Tier</span>
        <FormControl size="small" fullWidth>
          <Select value={fields.Tier} onChange={(e) => setField("Tier", e.target.value)}>
            {[1, 2, 3, 4, 5].map((tier) => (
              <MenuItem key={tier} value={tier}>
                Tier {tier}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </div>
      <div className="tfield">
        <span className="filter-label">Year</span>
        <TextField
          size="small"
          type="number"
          value={fields.Year}
          onChange={(e) => setField("Year", e.target.value)}
          fullWidth
        />
      </div>
      <div className="tfield">
        <span className="filter-label">Prize pool $</span>
        <TextField
          size="small"
          type="number"
          value={fields.Prizepool}
          onChange={(e) => setField("Prizepool", e.target.value)}
          placeholder="blank = unknown"
          fullWidth
        />
      </div>
      <div className="tfield f-lan">
        <span className="filter-label">Setting</span>
        <button
          type="button"
          className={`plate${fields.LAN ? " on" : ""}`}
          onClick={() => setField("LAN", !fields.LAN)}
        >
          <span className="led" />
          LAN
        </button>
      </div>
      {PLACEMENTS.map((p) => (
        <div className="tfield" key={p}>
          <span className={`filter-label ${PLACEMENT_TINTS[p]}`}>{p}</span>
          <TextField
            size="small"
            value={fields[p]}
            onChange={(e) => setField(p, e.target.value)}
            placeholder="player"
            fullWidth
          />
        </div>
      ))}

      {children}

      {errors.length > 0 && (
        <div className="admin-error f-span">
          {errors.map((err) => (
            <div key={err}>{err}</div>
          ))}
        </div>
      )}
      {dupWarned && (
        <div className="admin-warn f-span">
          An event with this name, year, game and mode already exists — submit
          again to add anyway (normal for team events with multiple rows).
        </div>
      )}

      <div className="tform-actions f-span">
        <Button type="submit" variant="contained" color="primary" disabled={busy}>
          {dupWarned ? "Add anyway" : submitLabel}
        </Button>
        {isEdit && onDelete && (
          <Button
            variant="text"
            className="tab-idle btn-danger"
            onClick={handleDelete}
            disabled={busy}
          >
            {confirmingDelete ? "Really delete?" : "Delete row"}
          </Button>
        )}
        {onCancel && (
          <Button variant="text" className="tab-idle" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
};

export default TournamentForm;
