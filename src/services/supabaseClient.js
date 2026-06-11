import { createClient } from "@supabase/supabase-js";

// Public config from .env (committed) — see known-issues history; the anon key
// is the only key that ever ships. supabase-js throws a clear error at load if
// either value is missing from the build environment.
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
export const supabase = createClient(supabaseUrl, supabaseKey);
