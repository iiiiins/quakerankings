# Feature 3 — Admin data-entry, full CRUD (roadmap.md §3)

Session 2026-06-11. The auth/RLS design was fixed in the roadmap; two dashboard-only steps
(policies SQL + disable signups) ran mid-session as a Bruno handoff. No deploy without "ship it".

## Assumptions / build-time decisions (held)

- `.env` (committed) = public config (Supabase URL, anon key, GA id); `.env.local` = secrets
  (service key, ADMIN_EMAIL/ADMIN_PASSWORD). CRA bakes env at server/build start.
- Admin user created programmatically (service key) with a generated password; Bruno replaced
  it with his own in `.env.local` mid-session (aligned to auth via admin API — see review).
- Edit affordance desktop-only on /events; editor edits raw rows (team events → row picker).
- Adds on `/admin`; corrections from the browser surface. Insert id = max+1 (script's scheme).
- Names lowercased on save via shared `normalizeRow`; soft dup warning (warn once, then allow).
- No signup/reset UI; `/admin` has no nav tab — RLS is the gate, not obscurity.

## Plan

- [x] **Commit 1 — chore: env vars** (`f1eb7b5`) — .env + supabaseClient/App.js/import script
      on env config. Verified: site loads full data + GA; script dry-run green. Known issue #1
      closed.
- [x] **Commit 2 — refactor: shared validation rules** (`79b3b60`) — tournamentRules.js (CJS),
      import script refactored onto it. Verified: 9-case invalid CSV reports every rule with
      raw sheet values; valid row plans clean.
- [x] **Commit 3 — feat(scripts): admin setup + RLS probes** (`51921a0`) — create-admin-user.js
      (user `bcbf6194…` created, creds → .env.local, setup-admin.sql emitted), probe-rls.js.
      **Baseline probe found a live gap**: signups OPEN + legacy policy allowing ANY
      authenticated INSERT → SQL rewritten to wipe all policies first (DO block).
- [x] **Commit 4 — feat: auth session + /admin login** (`23847f7`) — useSession + login card.
      Verified: bad creds error, real login, session survives reload, sign-out clears.
- [x] **Commit 5 — feat: add-tournament form** (`069ab12`) — TournamentForm + tournamentWrites
      (0-rows guard) + refreshTournaments. Verified: rule errors render; dup warning on
      QuakeCon 2008/QL/CTF; live insert #1928 → visible in /events, name lowercased; cleaned.
      Gotcha fixed: babel-helper syntax flips the CJS rules file to ESM (build error) —
      rewrote with Object.assign/forEach + guard comment; consumers default-import.
- [x] **Commit 6 — feat: edit/delete from the browser** (`6c3be8c`) — pencil column (authed,
      desktop), EventEditDialog (row picker for team events, add-row, dialog re-derives event
      by key). Verified incl. pre-SQL negative path ("No row was updated — write rejected").
- [x] **HANDOFF → Bruno**: SQL pasted, signups disabled. ✔ done same session.
- [x] **Verification (post-handoff)**: `probe-rls.js --full` **8/8 PASS** (anon
      insert/update/delete rejected, public signup rejected, admin insert/update/delete
      allowed, row count restored). UI E2E against live RLS: add #1928 → edit ($777→$999 +
      2nd place) → two-step delete → 1,385 events restored; sign-out removes pencils.
- [x] **Commit 7 — fix: sign-out zombie sessions** (`9ace29b`) — found during E2E: signOut()
      on a server-revoked session errors without clearing the persisted token (tab stranded
      signed-in). Handler force-clears sb-*-auth-token + reloads. Both paths verified.
- [x] **Commit 8 — docs**: CLAUDE.md (overview, stack, structure incl. scripts/, write-access
      model, auth flow, known issues renumbered, quirks), roadmap §3 SHIPPED + decision log,
      this review.
- [x] Final: `npm run build` green (268.91 kB gz, +5.3 kB over feature 2). No deploy — gate.

## Review

Built roadmap feature 3 in seven code commits + docs, all verified against the live dev
preview and the live Supabase project. **Not deployed** — awaiting "ship it".

The probe-first approach paid for itself before any UI existed: the baseline run exposed that
production was one scripted signup away from arbitrary inserts (open signups + a legacy
any-authenticated INSERT policy). The setup SQL now nukes every existing policy before
creating the four intended ones, and the probe is the standing regression tool for the
roadmap's verification requirement (insert AND update AND delete, both roles, plus signup).

Incidents handled mid-session, both worth remembering:
- Bruno rotated ADMIN_PASSWORD in .env.local but the dashboard-side change didn't land —
  resolved by setting auth to the .env.local value via the admin API (the secrets file is the
  contract; his password never entered the transcript).
- My own mid-session password updates revoked the preview's server-side session, which exposed
  the supabase-js zombie-sign-out bug (commit 7) — sign-out silently no-ops on a
  revoked/expired session, stranding the tab. Real-world trigger: dashboard password rotation
  with a site tab open.

Deviations from the roadmap's letter: none of substance — the design (auth method, RLS shape,
client key model, full-CRUD-on-browser-surface, both riders) shipped as specced.
