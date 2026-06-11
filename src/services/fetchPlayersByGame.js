import { supabase } from "./supabaseClient";

export async function fetchListTournaments() {
  const { data: tournaments, error } = await supabase
    .from("Tournaments")
    .select();
  if (error) {
    console.error("Error fetching tournaments:", error.message);
    return [];
  }
  return tournaments;
}
