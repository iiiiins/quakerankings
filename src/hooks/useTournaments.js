import { useEffect, useState } from "react";
import { fetchListTournaments } from "../services/fetchPlayersByGame";

// Module-level cache: the full Tournaments table is fetched once per session
// and shared across pages. Empty results (including fetch errors) are not
// cached, so a later mount retries. Admin writes call refreshTournaments()
// to drop the cache and push fresh data to every mounted consumer.
let cachedTournaments = null;
let inflight = null;
const subscribers = new Set();

function load() {
  if (!inflight) {
    inflight = fetchListTournaments().then((list) => {
      inflight = null;
      const result = Array.isArray(list) ? list : [];
      if (result.length > 0) cachedTournaments = result;
      subscribers.forEach((notify) => notify(result));
      return result;
    });
  }
  return inflight;
}

// After a write: refetch and update all mounted consumers.
export function refreshTournaments() {
  cachedTournaments = null;
  return load();
}

export default function useTournaments() {
  const [tournaments, setTournaments] = useState(cachedTournaments || []);

  useEffect(() => {
    subscribers.add(setTournaments);
    if (!cachedTournaments) load();
    return () => subscribers.delete(setTournaments);
  }, []);

  return tournaments;
}
