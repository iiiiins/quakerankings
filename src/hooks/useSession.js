import { useEffect, useState } from "react";
import { supabase } from "../services/supabaseClient";

// Supabase auth session, kept in sync across the app. supabase-js persists
// the session in localStorage and refreshes tokens; this hook just mirrors it
// into React state. `loading` is true only until the initial getSession.
export default function useSession() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      if (alive) setSession(s);
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { session, loading };
}
