// Creates the single admin user (feature 3) via the service key and emits the
// RLS policies SQL with the user's uuid baked in.
//
//   node scripts/create-admin-user.js <email>
//
// Idempotent: if the user already exists it is reused (password untouched).
// On create: a random password is generated and written to .env.local as
// ADMIN_EMAIL / ADMIN_PASSWORD (gitignored) — rotate it in the Supabase
// dashboard whenever you like. Always (re)writes scripts/setup-admin.sql.

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { createClient } = require("@supabase/supabase-js");
const { loadEnv } = require("./env");

const SQL_TEMPLATE = (uuid) => `-- Quake Player Rankings — admin write policies (feature 3).
-- Run once in the Supabase SQL editor (Dashboard -> SQL Editor -> paste -> Run).
-- Idempotent: safe to re-run.
--
-- Model: SELECT stays public; INSERT/UPDATE/DELETE require the authenticated
-- role AND the single admin uid (defense-in-depth on top of disabled signups).
-- Grants are restated defensively — RLS is the real gate.
--
-- The DO block drops EVERY existing policy on the table first: the 2026-06-11
-- probe found a legacy policy already allowing any authenticated user to
-- INSERT — permissive policies OR together, so it would defeat the uid scope
-- if left in place. The four policies below are the complete intended set.

alter table public."Tournaments" enable row level security;

grant select on public."Tournaments" to anon;
grant select, insert, update, delete on public."Tournaments" to authenticated;

do $$
declare pol record;
begin
  for pol in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'Tournaments'
  loop
    execute format('drop policy %I on public."Tournaments"', pol.policyname);
  end loop;
end $$;

create policy "public read" on public."Tournaments"
  for select to anon, authenticated using (true);

create policy "admin insert" on public."Tournaments"
  for insert to authenticated with check (auth.uid() = '${uuid}');

create policy "admin update" on public."Tournaments"
  for update to authenticated
  using (auth.uid() = '${uuid}') with check (auth.uid() = '${uuid}');

create policy "admin delete" on public."Tournaments"
  for delete to authenticated using (auth.uid() = '${uuid}');
`;

function upsertEnvLocal(pairs) {
  const p = path.join(__dirname, "..", ".env.local");
  let text = fs.existsSync(p) ? fs.readFileSync(p, "utf8") : "";
  for (const [key, value] of Object.entries(pairs)) {
    const line = `${key}=${value}`;
    const re = new RegExp(`^${key}=.*$`, "m");
    text = re.test(text)
      ? text.replace(re, line)
      : text.replace(/\n?$/, "\n") + line + "\n";
  }
  fs.writeFileSync(p, text);
}

async function main() {
  const email = process.argv[2];
  if (!email || !email.includes("@")) {
    console.error("Usage: node scripts/create-admin-user.js <email>");
    process.exitCode = 1;
    return;
  }

  loadEnv();
  const url = process.env.REACT_APP_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  if (!url) throw new Error("REACT_APP_SUPABASE_URL missing — check .env");
  if (!serviceKey) throw new Error("SUPABASE_SERVICE_KEY missing — add it to .env.local");

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Reuse if the user already exists (idempotent re-runs)
  const { data: list, error: listErr } = await admin.auth.admin.listUsers();
  if (listErr) throw new Error(`listUsers failed: ${listErr.message}`);
  let user = list.users.find(
    (u) => (u.email || "").toLowerCase() === email.toLowerCase()
  );

  if (user) {
    console.log(`User already exists: ${email} (${user.id}) — reusing, password untouched.`);
    upsertEnvLocal({ ADMIN_EMAIL: email });
  } else {
    const password = crypto.randomBytes(18).toString("base64url");
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error) throw new Error(`createUser failed: ${error.message}`);
    user = data.user;
    upsertEnvLocal({ ADMIN_EMAIL: email, ADMIN_PASSWORD: password });
    console.log(`Created admin user ${email} (${user.id}).`);
    console.log(`Password generated and stored in .env.local (ADMIN_PASSWORD): ${password}`);
    console.log("Rotate it in the Supabase dashboard whenever you like.");
  }

  const sqlPath = path.join(__dirname, "setup-admin.sql");
  fs.writeFileSync(sqlPath, SQL_TEMPLATE(user.id));
  console.log(`\nWrote ${sqlPath} with uid ${user.id}.`);
  console.log("Next (dashboard, one time):");
  console.log("  1. SQL Editor -> paste scripts/setup-admin.sql -> Run");
  console.log('  2. Authentication -> Sign In / Up -> turn OFF "Allow new users to sign up"');
  console.log("  3. Verify: node scripts/probe-rls.js --full");
}

main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
