import { supabase } from "./supabaseClient";
// Default-import + destructure: tournamentRules is CommonJS (see the note in
// TournamentForm.js) — named imports from CJS fail CRA's strictExportPresence.
import tournamentRules from "../lib/tournamentRules";

const { PLACEMENTS, normalizeRow } = tournamentRules;

// Input caps, mirrored by DB check constraints in setup-submissions.sql —
// the client side is UX, the DB side is the enforcement.
export const NOTE_MAX = 500;
export const HANDLE_MAX = 40;

// Public submit path. anon may only INSERT (no SELECT grant), so no .select()
// chain — supabase-js defaults to return=minimal. status is not sent: the
// column isn't in the anon grant; the DB default + WITH CHECK pin 'pending'.
export async function submitSuggestion({ type, targetId, payload, note, handle, website }) {
  // Honeypot tripped: report success without storing anything — a form bot
  // gets no signal that the field was the tell.
  if (website) return {};
  const { error } = await supabase.from("Submissions").insert({
    type,
    target_id: targetId ?? null,
    payload,
    note: (note || "").trim().slice(0, NOTE_MAX) || null,
    handle: (handle || "").trim().slice(0, HANDLE_MAX) || null,
    website: "",
  });
  return error ? { error } : {};
}

// Queue payloads arrive through an endpoint that is open to anon by design —
// never spread one into a write or into JSX. Rebuild from the known Tournaments
// columns with string guards (validateRow then judges the values), so unknown
// keys are dropped and non-string placements can't crash normalizeRow.
export function rowFromPayload(payload) {
  const p = payload && typeof payload === "object" && !Array.isArray(payload) ? payload : {};
  const str = (v) => (typeof v === "string" ? v : "");
  const row = {
    Event_Name: str(p.Event_Name),
    Game: p.Game,
    Mode: p.Mode,
    Tier: p.Tier,
    Year: p.Year,
    LAN: p.LAN,
    Prizepool: typeof p.Prizepool === "number" ? p.Prizepool : null,
  };
  PLACEMENTS.forEach((pl) => {
    row[pl] = str(p[pl]);
  });
  return normalizeRow(row);
}

// Admin-only reads/writes below — RLS scopes them to the admin uid; like
// tournamentWrites, 0-affected-rows is surfaced as a visible error.

export async function fetchPendingSubmissions() {
  const { data, error } = await supabase
    .from("Submissions")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true });
  return error ? { error } : { submissions: data || [] };
}

export async function setSubmissionStatus(id, status) {
  const { data, error } = await supabase
    .from("Submissions")
    .update({ status })
    .eq("id", id)
    .select();
  if (error) return { error };
  if (!data || data.length === 0)
    return {
      error: { message: "No submission was updated — write rejected (not signed in as the admin?)" },
    };
  return {};
}
