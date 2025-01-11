import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://ruykhdsevmwnptvxiwll.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1eWtoZHNldm13bnB0dnhpd2xsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ0ODQyMjgsImV4cCI6MjA1MDA2MDIyOH0.Pvtw2J6uU4A_r0ntkUwriKvkm751YbQ4IWNqmYMAtTU";
export const supabase = createClient(supabaseUrl, supabaseKey);
