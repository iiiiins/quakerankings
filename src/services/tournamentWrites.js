import { supabase } from "./supabaseClient";

// Admin write paths. RLS silently no-ops UPDATE/DELETE for non-admin sessions
// (0 rows affected, no error) — the .select() + row-count guards turn that
// into a visible error instead of a false success.

export async function insertTournament(row) {
  // id has no DB default — same max+1 scheme as scripts/import-tournaments.js
  const { data: maxRow, error: maxErr } = await supabase
    .from("Tournaments")
    .select("id")
    .order("id", { ascending: false })
    .limit(1);
  if (maxErr) return { error: maxErr };
  const id = (maxRow[0]?.id ?? 0) + 1;
  const { error } = await supabase.from("Tournaments").insert({ id, ...row });
  return error ? { error } : { id };
}

export async function updateTournament(id, row) {
  const { data, error } = await supabase
    .from("Tournaments")
    .update(row)
    .eq("id", id)
    .select();
  if (error) return { error };
  if (!data || data.length === 0)
    return {
      error: { message: "No row was updated — write rejected (not signed in as the admin?)" },
    };
  return {};
}

export async function deleteTournament(id) {
  const { data, error } = await supabase
    .from("Tournaments")
    .delete()
    .eq("id", id)
    .select();
  if (error) return { error };
  if (!data || data.length === 0)
    return {
      error: { message: "No row was deleted — write rejected (not signed in as the admin?)" },
    };
  return {};
}
