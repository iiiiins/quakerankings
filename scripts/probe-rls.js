// RLS write probes for the Tournaments table (feature 3 verification).
//
//   node scripts/probe-rls.js          logged-out (anon) probes only
//   node scripts/probe-rls.js --full   + signed-in admin probes (needs
//                                        ADMIN_EMAIL/ADMIN_PASSWORD in .env.local)
//
// Never touches real data: a marker row is inserted via the service key
// (bypasses RLS) and all update/delete probes target marker rows only.
// Under RLS, blocked UPDATE/DELETE surface as 0 affected rows, not errors —
// the probes count rows via .select(). Exits 1 if any expectation fails.

const { createClient } = require("@supabase/supabase-js");
const { loadEnv } = require("./env");

const MARKER_NAME = "RLS PROBE — DELETE ME";

const markerRow = (id, suffix) => ({
  id,
  Event_Name: `${MARKER_NAME} ${suffix}`,
  Game: "Quake World",
  Mode: "Duel",
  Tier: 5,
  Year: 1996,
  LAN: false,
  Prizepool: null,
  "1st": "rls_probe",
});

const results = [];
function record(name, pass, detail) {
  results.push({ name, pass, detail });
  console.log(`  ${pass ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

async function main() {
  const full = process.argv.includes("--full");
  loadEnv();
  const url = process.env.REACT_APP_SUPABASE_URL;
  const anonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !anonKey) throw new Error("Supabase env missing — check .env");
  if (!serviceKey) throw new Error("SUPABASE_SERVICE_KEY missing — add it to .env.local");

  const noSession = { auth: { autoRefreshToken: false, persistSession: false } };
  const service = createClient(url, serviceKey, noSession);
  const anon = createClient(url, anonKey, noSession);

  const countRows = async () => {
    const { count, error } = await service
      .from("Tournaments")
      .select("*", { count: "exact", head: true });
    if (error) throw new Error(`count failed: ${error.message}`);
    return count;
  };

  const { data: maxRow, error: maxErr } = await service
    .from("Tournaments").select("id").order("id", { ascending: false }).limit(1);
  if (maxErr) throw new Error(`max-id query failed: ${maxErr.message}`);
  let nextId = (maxRow[0]?.id ?? 0) + 1;

  const startCount = await countRows();
  console.log(`Table has ${startCount} rows. Inserting probe target via service key...`);

  const targetId = nextId++;
  const { error: seedErr } = await service.from("Tournaments").insert(markerRow(targetId, "(target)"));
  if (seedErr) throw new Error(`seeding marker row failed: ${seedErr.message}`);

  try {
    console.log("\nLogged-out (anon) probes — all writes must be rejected:");

    const { error: insErr } = await anon.from("Tournaments").insert(markerRow(nextId, "(anon insert)"));
    record("anon INSERT rejected", Boolean(insErr), insErr ? insErr.message : "insert SUCCEEDED — RLS broken");
    if (!insErr) await service.from("Tournaments").delete().eq("id", nextId);
    nextId++;

    const { data: updData, error: updErr } = await anon
      .from("Tournaments").update({ Prizepool: 1 }).eq("id", targetId).select();
    record(
      "anon UPDATE rejected",
      Boolean(updErr) || (updData || []).length === 0,
      updErr ? updErr.message : `${(updData || []).length} row(s) affected`
    );

    const { data: delData, error: delErr } = await anon
      .from("Tournaments").delete().eq("id", targetId).select();
    record(
      "anon DELETE rejected",
      Boolean(delErr) || (delData || []).length === 0,
      delErr ? delErr.message : `${(delData || []).length} row(s) affected`
    );

    // Signups are the other gate: open signups would hand out authenticated
    // JWTs to anyone. Disabled-in-dashboard is the agreed primary control.
    // Plus-alias of the admin email: GoTrue blocklists fake domains
    // (example.com → "invalid" = false pass), and any confirmation mail
    // goes to the admin's own inbox. The probe user is deleted right after.
    const [adminUser, adminDomain] = (process.env.ADMIN_EMAIL || "probe@example.com").split("@");
    const probeEmail = `${adminUser}+rls-probe-${Date.now()}@${adminDomain}`;
    const { data: suData, error: suErr } = await anon.auth.signUp({
      email: probeEmail,
      password: "rls-probe-only-1!aA",
    });
    const signupUser = suData?.user;
    record(
      "public signup disabled",
      Boolean(suErr),
      suErr ? suErr.message : `signup SUCCEEDED (user ${signupUser?.id}) — disable signups in the dashboard`
    );
    if (signupUser?.id) {
      const { error: delUserErr } = await service.auth.admin.deleteUser(signupUser.id);
      if (delUserErr) console.error(`  cleanup: deleting probe user failed: ${delUserErr.message}`);
      else console.log(`  cleanup: probe user ${probeEmail} deleted.`);
    }

    if (full) {
      const email = process.env.ADMIN_EMAIL;
      const password = process.env.ADMIN_PASSWORD;
      if (!email || !password)
        throw new Error("--full needs ADMIN_EMAIL/ADMIN_PASSWORD in .env.local (run create-admin-user.js)");

      console.log(`\nSigned-in probes as ${email} — all writes must succeed:`);
      const authed = createClient(url, anonKey, noSession);
      const { error: signInErr } = await authed.auth.signInWithPassword({ email, password });
      if (signInErr) throw new Error(`sign-in failed: ${signInErr.message}`);

      const ownId = nextId++;
      const { error: aInsErr } = await authed.from("Tournaments").insert(markerRow(ownId, "(admin)"));
      record("admin INSERT allowed", !aInsErr, aInsErr?.message);

      const { data: aUpd, error: aUpdErr } = await authed
        .from("Tournaments").update({ Prizepool: 123 }).eq("id", ownId).select();
      record("admin UPDATE allowed", !aUpdErr && (aUpd || []).length === 1,
        aUpdErr ? aUpdErr.message : `${(aUpd || []).length} row(s) affected`);

      const { data: aDel, error: aDelErr } = await authed
        .from("Tournaments").delete().eq("id", ownId).select();
      record("admin DELETE allowed", !aDelErr && (aDel || []).length === 1,
        aDelErr ? aDelErr.message : `${(aDel || []).length} row(s) affected`);

      await authed.auth.signOut();
    }
  } finally {
    // Clean every marker row regardless of probe outcomes
    const { error: cleanErr } = await service
      .from("Tournaments").delete().like("Event_Name", `${MARKER_NAME}%`);
    if (cleanErr) console.error(`CLEANUP FAILED: ${cleanErr.message} — delete '${MARKER_NAME}*' rows manually!`);
  }

  const endCount = await countRows();
  record("row count restored", endCount === startCount, `${startCount} -> ${endCount}`);

  const failed = results.filter((r) => !r.pass);
  console.log(failed.length ? `\n${failed.length} probe(s) FAILED.` : "\nAll probes passed.");
  process.exitCode = failed.length ? 1 : 0;
}

main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
