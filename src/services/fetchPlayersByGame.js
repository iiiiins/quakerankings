import { supabase } from "./supabaseClient";
import fetchAllRows from "./fetchAllRows";

// Paged: a single select() stops at the 2,000-row cap (see fetchAllRows).
export async function fetchListTournaments() {
  const { data: tournaments, error } = await fetchAllRows(() =>
    supabase.from("Tournaments").select()
  );
  if (error) {
    console.error("Error fetching tournaments:", error.message);
    return [];
  }
  return tournaments;
}
