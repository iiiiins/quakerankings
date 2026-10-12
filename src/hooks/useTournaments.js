import { useEffect, useState } from "react";
import { fetchListTournamentsResult } from "../services/fetchPlayersByGame";

// Module-level cache: the full Tournaments table is fetched once per session
// and shared across pages. Empty results (including fetch errors) are not
// cached, so a later mount retries. Admin writes call refreshTournaments()
// to drop the cache and push fresh data to every mounted consumer.
//
// Load status ("loading" | "ready" | "error") rides alongside so pages can
// show a spinner instead of a zero-count flash, and a message on failure.
let cachedTournaments = null;
let inflight = null;
let status = "loading";
const subscribers = new Set();

// Dev-only screenshot aids: ?slow delays the fetch 5 s, ?fail fakes an error.
// e.g. http://localhost:3312/?slow#/  (no effect in production builds)
const devFlag = (name) =>
  process.env.NODE_ENV !== "production" &&
  typeof window !== "undefined" &&
  new URLSearchParams(window.location.search).has(name);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchWithDevFlags() {
  if (devFlag("slow")) await wait(5000);
  if (devFlag("fail")) return { data: null, error: { message: "Simulated failure (?fail)" } };
  return fetchListTournamentsResult();
}

function notify(list) {
  subscribers.forEach((fn) => fn({ list, status }));
}

function load() {
  if (!inflight) {
    // A refresh with data already on screen stays "ready" (no spinner flash
    // after admin writes); only a cold load shows "loading".
    if (!cachedTournaments) {
      status = "loading";
      notify([]);
    }
    inflight = fetchWithDevFlags().then(({ data, error }) => {
      inflight = null;
      if (error) console.error("Error fetching tournaments:", error.message);
      const result = Array.isArray(data) ? data : [];
      if (error && cachedTournaments) {
        status = "ready"; // keep showing the last good data
        notify(cachedTournaments);
        return cachedTournaments;
      }
      status = error ? "error" : "ready";
      if (result.length > 0) cachedTournaments = result;
      notify(result);
      return result;
    });
  }
  return inflight;
}

// After a write (or a Retry): refetch and update all mounted consumers.
export function refreshTournaments() {
  return load();
}

// Test hook: reset module state between tests.
export function __resetTournamentsCache() {
  cachedTournaments = null;
  inflight = null;
  status = "loading";
}

function useTournamentsState() {
  const [state, setState] = useState(() => ({
    list: cachedTournaments || [],
    status: cachedTournaments ? "ready" : status === "error" ? "error" : "loading",
  }));

  useEffect(() => {
    subscribers.add(setState);
    if (!cachedTournaments && !inflight) load();
    else if (inflight && !cachedTournaments) setState({ list: [], status: "loading" });
    return () => subscribers.delete(setState);
  }, []);

  return state;
}

export default function useTournaments() {
  return useTournamentsState().list;
}

// { tournaments, loading, error } for pages that render a load state.
export function useTournamentsStatus() {
  const { list, status: s } = useTournamentsState();
  return { tournaments: list, loading: s === "loading", error: s === "error" };
}
