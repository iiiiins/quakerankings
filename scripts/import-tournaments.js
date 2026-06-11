// Imports tournaments from the "next to add" Google Sheet tab into Supabase.
//
//   node scripts/import-tournaments.js            fetch sheet, validate, confirm, insert
//   node scripts/import-tournaments.js --dry-run  validate + show the plan, never write
//   node scripts/import-tournaments.js --csv <p>  read a local CSV file instead of the sheet
//
// Reads are made with the public anon key. Inserting requires the service role
// key in .env.local (gitignored):  SUPABASE_SERVICE_KEY=...
// Get it from Supabase dashboard -> Project Settings -> API -> service_role.

const fs = require("fs");
const path = require("path");
const readline = require("readline");
const { createClient } = require("@supabase/supabase-js");

const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/1kLwGkzlC82_wjiDTEJuy5Q7nbeCFAmmQNwv-tFeTP4o/export?format=csv&gid=1304795890";
const SUPABASE_URL = "https://ruykhdsevmwnptvxiwll.supabase.co";
// Public anon key (read-only, same one the site ships) — used for dry runs and dupe checks.
const ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1eWtoZHNldm13bnB0dnhpd2xsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ0ODQyMjgsImV4cCI6MjA1MDA2MDIyOH0.Pvtw2J6uU4A_r0ntkUwriKvkm751YbQ4IWNqmYMAtTU";

const GAMES = ["Quake World", "Quake 2", "Quake 3", "Quake 4", "Quake Live", "Quake Champions", "Diabotical"];
const MODES = ["Duel", "2v2", "TDM", "CTF", "CA", "SAC", "WIP", "DBT"];
const PLACEMENTS = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th"];
const CURRENT_YEAR = new Date().getFullYear();

function loadEnvLocal() {
  const p = path.join(__dirname, "..", ".env.local");
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2];
  }
}

function parseCsv(text) {
  const rows = [];
  let row = [], field = "", inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      rows.push(row); row = [];
    } else field += c;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((f) => f.trim() !== ""));
}

function toRecords(rows) {
  const header = rows[0].map((h) => h.trim());
  return rows.slice(1).map((r, i) => {
    const rec = { _line: i + 2 };
    header.forEach((h, j) => (rec[h] = (r[j] ?? "").trim()));
    return rec;
  });
}

function isStub(rec) {
  return rec.Event_Name === "" && PLACEMENTS.every((p) => (rec[p] ?? "") === "");
}

function validate(rec) {
  const errs = [];
  if (!rec.Event_Name) errs.push("missing Event_Name");
  if (!GAMES.includes(rec.Game)) errs.push(`unknown Game "${rec.Game}"`);
  if (!MODES.includes(rec.Mode)) errs.push(`unknown Mode "${rec.Mode}"`);
  const tier = Number(rec.Tier);
  if (!Number.isInteger(tier) || tier < 1 || tier > 5) errs.push(`Tier must be 1-5, got "${rec.Tier}"`);
  const year = Number(rec.Year);
  if (!Number.isInteger(year) || year < 1996 || year > CURRENT_YEAR)
    errs.push(`Year must be 1996-${CURRENT_YEAR}, got "${rec.Year}"`);
  if (!/^(true|false)$/i.test(rec.LAN)) errs.push(`LAN must be TRUE or FALSE, got "${rec.LAN}"`);
  if (rec.Prizepool !== "" && isNaN(Number(rec.Prizepool))) errs.push(`Prizepool not a number: "${rec.Prizepool}"`);
  if (PLACEMENTS.every((p) => rec[p] === "")) errs.push("no players in any placement");
  return errs;
}

function toRow(rec) {
  const row = {
    Year: Number(rec.Year),
    Game: rec.Game,
    Event_Name: rec.Event_Name,
    LAN: /^true$/i.test(rec.LAN),
    Mode: rec.Mode,
    Prizepool: rec.Prizepool === "" ? null : Number(rec.Prizepool),
    Tier: Number(rec.Tier),
  };
  for (const p of PLACEMENTS) row[p] = rec[p] === "" ? null : rec[p].toLowerCase();
  return row;
}

const contentKey = (r) =>
  [r.Event_Name, r.Year, r.Game, r.Mode, ...PLACEMENTS.map((p) => r[p] ?? "")].join("|").toLowerCase();
const eventKey = (r) => `${r.Event_Name}|${r.Year}`.toLowerCase();

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const csvIdx = args.indexOf("--csv");

  let csvText;
  if (csvIdx !== -1) {
    csvText = fs.readFileSync(args[csvIdx + 1], "utf8");
    console.log(`Source: local file ${args[csvIdx + 1]}`);
  } else {
    console.log("Fetching the 'next to add' sheet tab...");
    const res = await fetch(SHEET_CSV_URL, { redirect: "follow" });
    if (!res.ok) throw new Error(`Sheet fetch failed: HTTP ${res.status}`);
    csvText = await res.text();
    if (csvText.trimStart().startsWith("<")) throw new Error("Sheet returned HTML — is the tab still link-readable?");
  }

  const records = toRecords(parseCsv(csvText));
  const stubs = records.filter(isStub);
  const candidates = records.filter((r) => !isStub(r));
  if (stubs.length) console.log(`Skipping ${stubs.length} empty/stub row(s).`);
  if (!candidates.length) {
    console.log("Nothing to import — the tab has no filled rows.");
    return;
  }

  const invalid = [];
  for (const rec of candidates) {
    const errs = validate(rec);
    if (errs.length) invalid.push({ rec, errs });
  }
  if (invalid.length) {
    console.error(`\n${invalid.length} invalid row(s) — fix the sheet and rerun:`);
    for (const { rec, errs } of invalid)
      console.error(`  line ${rec._line} (${rec.Event_Name || "?"}): ${errs.join("; ")}`);
    process.exitCode = 1;
    return;
  }

  const rows = candidates.map(toRow);

  // in-batch exact duplicates: keep the first occurrence
  const seen = new Set();
  const batchDupes = [];
  const unique = rows.filter((r) => {
    const k = contentKey(r);
    if (seen.has(k)) { batchDupes.push(r); return false; }
    seen.add(k);
    return true;
  });

  loadEnvLocal();
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  const supabase = createClient(SUPABASE_URL, dryRun || !serviceKey ? ANON_KEY : serviceKey);

  const names = [...new Set(unique.map((r) => r.Event_Name))];
  const { data: existing, error: exErr } = await supabase
    .from("Tournaments")
    .select(`id,Event_Name,Year,Game,Mode,${PLACEMENTS.map((p) => `"${p}"`).join(",")}`)
    .in("Event_Name", names);
  if (exErr) throw new Error(`Dupe-check query failed: ${exErr.message}`);

  const existingContent = new Set(existing.map(contentKey));
  const existingEvents = new Map();
  for (const e of existing) existingEvents.set(eventKey(e), (existingEvents.get(eventKey(e)) || 0) + 1);

  const dbDupes = unique.filter((r) => existingContent.has(contentKey(r)));
  const clean = unique.filter((r) => !existingContent.has(contentKey(r)));
  const warnings = clean.filter((r) => existingEvents.has(eventKey(r)));

  const { data: maxRow, error: maxErr } = await supabase
    .from("Tournaments").select("id").order("id", { ascending: false }).limit(1);
  if (maxErr) throw new Error(`Max-id query failed: ${maxErr.message}`);
  let nextId = (maxRow[0]?.id ?? 0) + 1;
  for (const r of clean) r.id = nextId++;

  console.log(`\nPlan — ${clean.length} row(s) to insert, ids ${clean[0]?.id ?? "-"}..${nextId - 1}:`);
  for (const r of clean)
    console.log(`  ${r.id}  ${r.Year}  ${r.Game} | ${r.Mode} | T${r.Tier} | ${r.LAN ? "LAN" : "Online"}  ${r.Event_Name}  (${PLACEMENTS.filter((p) => r[p]).length} players)`);
  if (batchDupes.length) {
    console.log(`\nExcluded ${batchDupes.length} exact duplicate(s) within the sheet itself:`);
    for (const r of batchDupes) console.log(`  ${r.Event_Name} (${r.Year} ${r.Mode})`);
  }
  if (dbDupes.length) {
    console.log(`\nExcluded ${dbDupes.length} row(s) already in Supabase with identical content:`);
    for (const r of dbDupes) console.log(`  ${r.Event_Name} (${r.Year} ${r.Mode})`);
  }
  if (warnings.length) {
    console.log(`\nHeads-up — same event name + year already exists (fine for multi-team/bracket events, check it's not a re-import):`);
    for (const r of warnings) console.log(`  ${r.Event_Name} (${r.Year} ${r.Mode}) — ${existingEvents.get(eventKey(r))} existing row(s)`);
  }

  if (!clean.length) { console.log("\nNothing new to insert."); return; }
  if (dryRun) { console.log("\nDry run — nothing written."); return; }

  if (!serviceKey) {
    console.error("\nSUPABASE_SERVICE_KEY is not set, so I can't write.");
    console.error("Add it to .env.local (gitignored) in the project root:");
    console.error("  SUPABASE_SERVICE_KEY=<service_role key from Supabase dashboard -> Settings -> API>");
    process.exitCode = 1;
    return;
  }

  const answer = await new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(`\nInsert ${clean.length} row(s)? [y/N] `, (a) => { rl.close(); resolve(a.trim().toLowerCase()); });
  });
  if (answer !== "y" && answer !== "yes") { console.log("Aborted — nothing written."); return; }

  const { error: insErr } = await supabase.from("Tournaments").insert(clean);
  if (insErr) throw new Error(`Insert failed: ${insErr.message}`);

  const { count } = await supabase.from("Tournaments").select("*", { count: "exact", head: true });
  console.log(`\nInserted ${clean.length} row(s). Table now has ${count} tournaments, max id ${nextId - 1}.`);
  console.log("Remember to clear the imported rows from the 'next to add' tab.");
}

main().catch((e) => { console.error(e.message); process.exitCode = 1; });
