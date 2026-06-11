import { useEffect, useState } from "react";
import { fetchListTournaments } from "../services/fetchPlayersByGame";

// Module-level cache: the full Tournaments table is fetched once per session
// and shared between PlayerList and AdvancedStats. Empty results (including
// fetch errors) are not cached, so a later mount retries.
let cachedTournaments = null;

export default function useTournaments() {
  const [tournaments, setTournaments] = useState(cachedTournaments || []);

  useEffect(() => {
    if (cachedTournaments) return;
    let alive = true;
    fetchListTournaments().then((list) => {
      if (Array.isArray(list) && list.length > 0) {
        cachedTournaments = list;
      }
      if (alive) setTournaments(Array.isArray(list) ? list : []);
    });
    return () => {
      alive = false;
    };
  }, []);

  return tournaments;
}
