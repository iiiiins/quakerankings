# Feature 3 — Admin data-entry, full CRUD (roadmap.md §3)

Session 2026-06-11. The auth/RLS design is fixed in the roadmap (Supabase email/password,
signups disabled, single-user RLS on writes, anon key stays the only shipped key). Two steps
are dashboard-only and land mid-session as a Bruno handoff: paste the policies SQL, toggle
signups off. Everything else builds and verifies here. No deploy without "ship it".

## Assumptions / build-time decisions (made now, surfaced for review)

- `.env` (committed) carries the **public** config — Supabase URL, anon key, GA id; these ship
  in the bundle by design, the env-var move is hygiene not secrecy. Secrets stay in
  `.env.local` (gitignored): service key (already there), admin email/password (added by the
  user-creation script). CRA bakes `REACT_APP_*` at build/server start → dev server restart.
- Admin user is created programmatically via the service key (auth admin API) with a
  **generated password** stored in `.env.local`; Bruno rotates it in the dashboard whenever he
  likes. His uuid gets baked into the policies SQL.
- **Edit affordance is desktop-only** on /events (pencil column when signed in); mobile rows
  stay read-only — admin corrections are a desktop task.
- The editor edits **rows**, not grouped events (feature-2 note): single-row event → form
  directly; multi-row team event → row picker first, plus "add row to this event" (prefilled).
- Adds live on `/admin` (login + blank form); corrections start from the browser surface
  (find event → edit) per the roadmap decision.
- Insert computes `id = max+1` client-side — mirrors the import script (no DB autoincrement).
- Player names lowercased on save (shared rule — PlayerPage queries depend on lowercase names);
  Event_Name kept as typed (DB has mixed case).
- Soft duplicate warning on insert (same Event_Name+Year+Game+Mode exists) — warn, don't
  block: legitimate for multi-row team events.
- No password-reset/signup UI — single user, dashboard handles recovery.

## Plan

- [ ] **Commit 1 — chore: env vars** — `.env` (URL/anon/GA), `supabaseClient.js` + `App.js`
      read env, import script reads `.env` too (service key stays `.env.local`). Restart dev
      server; verify site loads + data fetches + GA init; build passes. Closes known issue #1.
- [ ] **Commit 2 — refactor: shared validation rules** — `src/lib/tournamentRules.js` (CJS so
      both webpack and the node script consume it): GAMES/MODES/PLACEMENTS/tier+year bounds,
      `validateRow` on a normalized row, name-lowercasing helper. Import script refactored to
      use it; verified with a crafted CSV via `--csv --dry-run` (valid + each invalid case).
- [ ] **Commit 3 — feat: auth session + /admin login** — `useSession` hook (getSession +
      onAuthStateChange), `/admin` route: login card (design-system), signed-in state + sign
      out. Verify: renders, bad creds show GoTrue error, session UI switches.
- [ ] **Commit 4 — feat: add-tournament form** — `TournamentForm` (15 fields, shared
      validation, error list, dup warning), insert service (max-id+1), success feedback,
      `useTournaments` cache invalidation (subscriber refresh). Verify: validation errors
      render per rule; logged-out insert surfaces the RLS rejection.
- [ ] **Commit 5 — feat: edit/delete from the events browser** — groupEvents keeps raw rows;
      pencil column when authed (desktop); dialog: row picker for multi-row events → form in
      edit mode (update/delete + confirm), add-row-to-event. Verify: dialog opens prefilled
      from a real event, multi-row picker lists rows, writes blocked logged out.
- [ ] **Commit 6 — feat(scripts): admin setup + RLS probes** — `create-admin-user.js`
      (service key; creates confirmed user, writes ADMIN_EMAIL/ADMIN_PASSWORD to .env.local,
      emits `setup-admin.sql` with the uuid), `probe-rls.js` (logged-out insert/update/delete
      probes; `--full` adds signed-in marker-row insert→update→delete with cleanup). Run:
      user created; pre-SQL probe = all anon writes rejected.
- [ ] **HANDOFF → Bruno**: paste `scripts/setup-admin.sql` in the Supabase SQL editor; turn
      OFF "Allow new users to sign up" (Authentication → Sign In / Up); say done.
- [ ] **Verification (after handoff)**: `probe-rls.js --full` (anon: 3× rejected; admin:
      insert/update/delete succeed, row count restored). Preview E2E: login on /admin, add a
      marked test event, see it on /events, edit it from the browser, delete it, counts
      restored. Logged-out UI shows no edit affordances.
- [ ] **Commit 7 — docs**: CLAUDE.md (auth/admin section, env vars, structure, known issue #1
      closed), roadmap §3 SHIPPED + decision log, review here. No deploy — "ship it" gate.

## Review

(to fill at session end)
