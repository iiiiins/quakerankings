// RLS write probes for the Tournaments table (feature 3 verification) and the
// Submissions table (feature 5 — requires scripts/setup-submissions.sql).
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
const SUB_MARKER_HANDLE = "rls_probe";

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

// A plausible submission body — the anon submit path sends exactly this shape
// (status comes from the column default; the column isn't even granted).
const subMarker = (suffix) => ({
  type: "new",
  target_id: null,
  payload: { Event_Name: `${MARKER_NAME} ${suffix}` },
  note: `probe ${suffix}`,
  handle: SUB_MARKER_HANDLE,
  website: "",
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

  const countSubmissions = async () => {
    const { count, error } = await service
      .from("Submissions")
      .select("*", { count: "exact", head: true });
    if (error)
      throw new Error(
        `Submissions count failed: ${error.message} — has scripts/setup-submissions.sql been run?`
      );
    return count;
  };

  const { data: maxRow, error: maxErr } = await service
    .from("Tournaments").select("id").order("id", { ascending: false }).limit(1);
  if (maxErr) throw new Error(`max-id query failed: ${maxErr.message}`);
  let nextId = (maxRow[0]?.id ?? 0) + 1;

  const startCount = await countRows();
  const subStartCount = await countSubmissions();
  console.log(`Tournaments has ${startCount} rows, Submissions ${subStartCount}. Inserting probe target via service key...`);

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

    // ---- Submissions (feature 5): anon may ONLY insert pending rows ----
    console.log("\nSubmissions probes — anon insert-only, invisible queue:");

    const { error: sInsErr } = await anon
      .from("Submissions").insert(subMarker("(anon insert)"));
    record("anon submission INSERT allowed", !sInsErr, sInsErr?.message);

    // Locate the row it created via the service key (anon has no SELECT)
    const { data: subRows, error: subFindErr } = await service
      .from("Submissions").select("id,status").eq("handle", SUB_MARKER_HANDLE)
      .order("id", { ascending: false }).limit(1);
    if (subFindErr) throw new Error(`finding marker submission failed: ${subFindErr.message}`);
    const subId = subRows[0]?.id;
    record(
      "submission landed as pending",
      subRows[0]?.status === "pending",
      `status=${subRows[0]?.status ?? "row missing"}`
    );

    const { error: sStatusErr } = await anon
      .from("Submissions").insert({ ...subMarker("(non-pending)"), status: "approved" });
    record(
      "anon non-pending INSERT rejected",
      Boolean(sStatusErr),
      sStatusErr ? sStatusErr.message : "insert SUCCEEDED — status not locked down"
    );

    const { error: sHpErr } = await anon
      .from("Submissions").insert({ ...subMarker("(honeypot)"), website: "https://spam.example" });
    record(
      "anon honeypot INSERT rejected",
      Boolean(sHpErr),
      sHpErr ? sHpErr.message : "insert SUCCEEDED — honeypot check missing"
    );

    const { error: sCapErr } = await anon
      .from("Submissions").insert({ ...subMarker("(cap)"), note: "x".repeat(600) });
    record(
      "anon over-cap note rejected",
      Boolean(sCapErr),
      sCapErr ? sCapErr.message : "insert SUCCEEDED — length caps missing"
    );

    const { data: sSel, error: sSelErr } = await anon
      .from("Submissions").select("*").limit(5);
    record(
      "anon submission SELECT rejected",
      Boolean(sSelErr) || (sSel || []).length === 0,
      sSelErr ? sSelErr.message : `${(sSel || []).length} row(s) readable`
    );

    const { data: sUpd, error: sUpdErr } = await anon
      .from("Submissions").update({ status: "approved" }).eq("id", subId ?? -1).select();
    record(
      "anon submission UPDATE rejected",
      Boolean(sUpdErr) || (sUpd || []).length === 0,
      sUpdErr ? sUpdErr.message : `${(sUpd || []).length} row(s) affected`
    );

    const { data: sDel, error: sDelErr } = await anon
      .from("Submissions").delete().eq("id", subId ?? -1).select();
    record(
      "anon submission DELETE rejected",
      Boolean(sDelErr) || (sDel || []).length === 0,
      sDelErr ? sDelErr.message : `${(sDel || []).length} row(s) affected`
    );

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

      console.log("\nSigned-in Submissions probes — the review-queue surface:");

      const { data: aSubSel, error: aSubSelErr } = await authed
        .from("Submissions").select("id,status").eq("id", subId ?? -1);
      record("admin submission SELECT allowed", !aSubSelErr && (aSubSel || []).length === 1,
        aSubSelErr ? aSubSelErr.message : `${(aSubSel || []).length} row(s) visible`);

      const { data: aSubUpd, error: aSubUpdErr } = await authed
        .from("Submissions").update({ status: "rejected" }).eq("id", subId ?? -1).select();
      record("admin submission UPDATE allowed", !aSubUpdErr && (aSubUpd || []).length === 1,
        aSubUpdErr ? aSubUpdErr.message : `${(aSubUpd || []).length} row(s) affected`);

      const { data: aSubDel, error: aSubDelErr } = await authed
        .from("Submissions").delete().eq("id", subId ?? -1).select();
      record("admin submission DELETE allowed", !aSubDelErr && (aSubDel || []).length === 1,
        aSubDelErr ? aSubDelErr.message : `${(aSubDel || []).length} row(s) affected`);

      await authed.auth.signOut();
    }
  } finally {
    // Clean every marker row regardless of probe outcomes
    const { error: cleanErr } = await service
      .from("Tournaments").delete().like("Event_Name", `${MARKER_NAME}%`);
    if (cleanErr) console.error(`CLEANUP FAILED: ${cleanErr.message} — delete '${MARKER_NAME}*' rows manually!`);
    const { error: subCleanErr } = await service
      .from("Submissions").delete().eq("handle", SUB_MARKER_HANDLE);
    if (subCleanErr) console.error(`SUBMISSIONS CLEANUP FAILED: ${subCleanErr.message} — delete handle='${SUB_MARKER_HANDLE}' rows manually!`);
  }

  const endCount = await countRows();
  record("row count restored", endCount === startCount, `${startCount} -> ${endCount}`);
  const subEndCount = await countSubmissions();
  record("submissions count restored", subEndCount === subStartCount, `${subStartCount} -> ${subEndCount}`);

  const failed = results.filter((r) => !r.pass);
  console.log(failed.length ? `\n${failed.length} probe(s) FAILED.` : "\nAll probes passed.");
  process.exitCode = failed.length ? 1 : 0;
}

main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
