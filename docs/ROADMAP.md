# Feature roadmap — v2

v1 written 2026-06-11 (planning session); v2 locked 2026-06-12 after the v1 committed set
shipped. This is the standing handoff for implementation sessions: **one committed feature per
session**, atomic commits, every step verified against the dev preview, no deploy without
Bruno's "ship it". Read `CLAUDE.md` (repo root) first for the codebase map; this file only
covers what to build, why, and what was decided against.

How v2 was set: Bruno's asks were (a) visitor submissions for new tournaments AND corrections,
(b) sharing your point system + the top-10 it produces, (c) more player depth. Interview
2026-06-12 locked: in-app submissions over a Google-Form pipeline; share link + image card;
all four player-depth candidates committed; order = sharing → submissions → player depth.

## Shipped (v1) — condensed; details in CLAUDE.md + git history

1. **Leaderboard upgrades + foundation** — useTournaments/computeRankings extraction, PPE
   column (min-events threshold), formula memory (`qpr.formula.v1`). Commits `772d97b`,
   `28f53b4`, `5d60ef5`; deployed bundle `f94633fc`.
2. **Tournament browser + methodology** — `/events` grouped-event browser (group key
   `Event_Name|Year|Game|Mode`, 1,925 rows → 1,385 events), `/methodology` footer page.
   Commits `9aaac5d`, `f3da4ca`; deployed bundle `4a86168d`.
3. **Admin full CRUD** — `.env` config, shared `tournamentRules`, Supabase email/password auth
   (signups disabled), uid-scoped RLS (`scripts/setup-admin.sql`), `/admin` add form, edit/
   delete from the browser, `probe-rls.js` as the standing security regression (8/8).
   Commits `f1eb7b5`…`9ace29b`; deployed bundle `98ad6618`. The baseline probe caught and
   killed a legacy any-authenticated-INSERT policy + open signups.
4. **Shareable rankings + top-10 card** — v1 share-URL public contract (`#/?f=v1…`,
   `lib/shareCodec.js` + 22-case suite, schema in CLAUDE.md), share popover (link/copy/
   chips), 1200×630 canvas card (download/clipboard), shared-view banner (adopt / one-click
   factory reset), custom-formula banner, PPE sort in the contract. Commits
   `7e6628e`…`a0a623b`; deployed bundle `38ed9e07`, verified live 2026-06-12 (hash + six
   feature markers in the served bundle).

## Committed features, in order

### 4. Shareable rankings + top-10 share card (~1–1.5 sessions)

> **Status: SHIPPED 2026-06-12** — bundle `38ed9e07` verified live (see Shipped section).
> Includes the three review follow-ups: PPE sort in the contract, custom-formula banner,
> shared-reset = default site. Schema documented in CLAUDE.md ("Share links — the v1
> public URL contract"). **The v1 encoding is now a live public contract.**

- **Share link**: encode the full scoring config (8 objects + minEventsForPpe, plus the list
  filters) into the URL; anyone opening it sees the board that formula produces. UI per the
  existing mock `docs/mocks/shareable-rankings-walkthrough.html` (share popover from the
  header's reserved icon slot; "viewing a shared ranking" banner with adopt/reset actions —
  adopt writes the shared formula into the visitor's localStorage).
- **Encoding is a permanent public contract** the moment links hit Discord: version it
  (`v1` prefix), omit defaults, document the schema in CLAUDE.md when it ships. HashRouter
  note: params live inside the fragment (`#/?f=…`) — parse from the hash, not `location.search`.
- **Share card rider**: client-side canvas render of the top-10 + a formula summary →
  downloadable / clipboard-copyable PNG in the site's visual language. This is the Discord
  answer: OG previews stay generic for all links (fragment never reaches a server), so the
  card is what makes a shared ranking *look* like something. Mind Orbitron font loading
  before canvas draw.
- Era presets deliberately NOT in this slice (backlog — they ride on the encoding for ~free).

### 5. Community submissions — in-app, with admin review queue (~1.5 sessions)

Supersedes v1's "B2-lite first" stance — two things changed: Bruno explicitly wants
corrections-from-visitors now, and feature 3 built the auth/RLS/admin surfaces that made
B2-full expensive. Decision logged 2026-06-12.

- **New `Submissions` table**: type (`new` | `correction`), `target_id` (row id for
  corrections), `payload` jsonb (proposed row / changes), optional submitter note + handle,
  `status` (`pending`/`approved`/`rejected`), honeypot column.
- **RLS**: anon INSERT only (WITH CHECK forces `status = 'pending'`); **no anon SELECT** —
  submissions are invisible to the public; admin uid gets SELECT/UPDATE/DELETE.
  ⚠ Needs a dashboard SQL handoff again (table + policies — service key can't DDL); ship a
  `scripts/setup-submissions.sql` the same way as feature 3, and **extend `probe-rls.js`**:
  anon CAN insert a pending submission, CANNOT read/update/delete any, and still can't touch
  `Tournaments`.
- **Public UI**: "suggest a fix" affordance on every event row (form prefilled with that
  event, reusing TournamentForm in a suggest mode) + a "submit a tournament" entry point on
  /events. Client-side validation via the shared `tournamentRules` so the queue stays clean.
  Spam posture: honeypot + length caps + review-before-apply; no captcha.
- **Admin queue** in `/admin`: pending list, diff view against the current row for
  corrections, approve (applies via `tournamentWrites` with the admin session, then marks
  approved) / reject. Sheet + import script stay for bulk; this is for drive-by QA.

### 6. Records page (~1 session) — player-depth opener

- `/records`: most titles (overall + per game), tier-1 title counts, grand-final conversion
  (min-N guard), longest career span, most events attended, biggest prize-pool events won
  (prize stays display-only data).
- The twist that makes it ours: **recomputes under the visitor's formula** — records respect
  the gear settings and visibility toggles (a hidden game's titles don't count while hidden).
- Cheap and standalone: useTournaments + computeRankings + groupEvents already provide
  everything. Nav decision at build time: 4th header tab vs footer link (mobile header is the
  constraint — tabs wrap below ~900px).

### 7. Rank-over-time + "who was #1" timeline (~1 session)

- **Per-year ranking engine**: run the scoring pipeline per year slice; memoized client-side
  (30 × computeRankings over 1,925 rows is fine).
- Build-time decision to settle at discuss-phase: *season* rank (results in year Y only) vs
  *career-to-date* rank (results ≤ Y). Lean: season for the #1 timeline ("best of 2005"),
  career-to-date for per-player rank curves — both views from one engine.
- Surfaces: rank-over-time as an AdvancedStats chart mode (player picker already exists);
  the #1 timeline strip lands wherever it reads best (records page or charts — build-time).
- This engine also feeds feature 9's "peak year" — that's why it precedes PlayerPage upgrades.

### 8. Career comparison page (~1 session)

- `/compare`: two player pickers → side-by-side career panels (titles per game, GF rate,
  career span, PPE) + overlaid points-over-time chart (chart.js two datasets) + the
  **meetings record**: events where both placed top-8, each player's bucket, who finished
  higher (ties when same bucket).
- **Naming is locked**: "Compare careers" — never "VS"/"head-to-head"; placements only, no
  match data, and Quakers reading H2H would expect real series results.
- Build a pure `lib/meetings.js` (pairwise shared events from rows) — feature 9's rivals
  block reuses it; that's why comparison precedes PlayerPage upgrades.
- Entry points: the route itself + a "compare this player" link on PlayerPage (build-time).

### 9. PlayerPage upgrades (~1 session) — consumes both engines

- **Rivals block**: most-shared-podium opponents from `lib/meetings.js`, framed as "shared
  podiums" with bucket-comparison tallies (placement-based framing, not match-based).
- **Peak year** under the current formula (per-year engine from feature 7).
- **Titles-by-game grid** and **career milestones** (first/last title, active span).
- Everything placement-derived only — no win streaks (years, not dates), no upsets (no
  seeds), no real H2H.

## Tier 2 backlog (interested, unordered)

- **Era presets** — 2–3 curated share links ("the golden era 2003–2013") on methodology/home;
  rides on feature 4's encoding for near-zero cost.
- **Embed widget** — iframe-able top-10 for forums/streams.
- **CSV export** of the current ranking.
- **Submission notifications** — surface "N pending" to Bruno (email/discord webhook needs a
  server or Edge Function — out of static-hosting scope today; the /admin badge is the free
  version).

## Rejected / parked, with rationale — don't relitigate without new information

- **Prize-pool weighting in the scoring formula** — rejected (v1): Bruno's tiers already
  encode prize pool (plus era and competitiveness); a prizepool weight would double-count.
  Prizepool stays display data (browser, records).
- **Era explorer as a standalone feature** — the year filter covers most of it; the remainder
  becomes era presets after feature 4.
- **Google-Form intake (B2-lite)** — superseded 2026-06-12 by committed feature 5 (in-app):
  explicit demand for visitor corrections + the feature-3 infrastructure flipped the
  cost/benefit. The sheet + import script remain the bulk-import path.
- **BrowserRouter migration** — still parked. It remains the only path to per-link previews
  and indexing (fragments never reach a server), and it risks every existing `#/` link +
  needs the GH Pages 404 trick. The share *card* (feature 4) is the deliberate mitigation.
  New revisit trigger: share links circulating in the wild with complaints that previews look
  generic.

## Cross-cutting constraints

- Static hosting (GitHub Pages), no server. Everything is client-side or Supabase. Writes:
  admin-only via uid-scoped RLS; feature 5 adds anon INSERT to `Submissions` only.
- **After any auth/RLS change, run `node scripts/probe-rls.js --full`** — and extend the probe
  whenever a new table/policy ships (feature 5). Dashboard SQL pastes are a known handoff
  step: prepare the `.sql`, Bruno pastes, verify by probe.
- The design system is fixed: new surfaces (share popover/banner/card, submission forms,
  queue, records, compare) drop into `src/theme.js` + the `App.css` design-system classes;
  visual target `docs/mocks/direction-hybrid.html`.
- Player names are stored lowercase (`tournamentRules.normalizeRow` on every write path);
  `eq` queries depend on it.
- Header tabs are near capacity — feature 6 decides the nav pattern for new pages (tab vs
  footer vs a "More" affordance), and features 7–9 follow it.
- One feature per implementation session; if a session drifts or runs long, stop and hand off
  fresh.

## Decision log

- 2026-06-11 — v1 interview: goal = depth for visitors; appetite = whatever it takes; data
  work = real admin with full CRUD. Committed order: leaderboard+foundation → browser+
  methodology → admin CRUD. (All three shipped same day — see Shipped section.)
- 2026-06-11 — PPE min-events (default 15, adjustable); comparison framing "Compare careers";
  prize-pool weighting rejected; feature-2 group key widened to include Game+Mode after the
  data probe; feature-3 baseline probe caught open signups + a legacy any-authenticated
  INSERT policy (both closed same day).
- 2026-06-12 — **v2 interview (Bruno)**: submissions = in-app suggest-a-fix + admin queue
  (supersedes B2-lite; rationale above); sharing = link + top-10 image card (era presets stay
  backlog); player depth = ALL FOUR candidates committed; order = sharing → submissions →
  depth.
- 2026-06-12 — Depth-internal order set by engine reuse: records (standalone opener) →
  rank-over-time (builds the per-year engine) → comparison (builds the meetings engine) →
  PlayerPage upgrades (consumes both).
- 2026-06-12 — **Feature 4 build decisions** (within the locked roadmap constraints): single
  versioned param (`f=v1.<dot-segments>`, omit-at-default, lenient decode — vocabulary may
  grow, grammar may not); share icon is home-route-only (the link always targets the home
  board); the address bar is never rewritten while tuning — the link is built on demand in
  the popover; search/column-sort/pager deliberately excluded from the contract; shared view
  = defaults + link overrides with formula-memory saving suppressed until "Keep this formula"
  (adopt keeps the current view; "Reset to default" restores the visitor's stored formula and
  remounts the board); card is 1200×630 landscape, recomputed through the same
  computeRankings pipeline as the board. First jest suite in the repo pins the URL contract
  (19 cases).
- 2026-06-12 — **Sort joins the share contract** (Bruno's catch: PPE-sorted board, unchanged
  card). `s<code>` segment, desc implied, vocabulary {ppe}; the line = a sort is shareable
  iff "top 10 by X" reads as a leaderboard — stat-column/alphabetical/ascending sorts stay
  view-local and canonicalize to points order ("most titles" → records page, feature 6).
  Share popover renders the canonical encode→decode state so chips/card ≡ what the link
  opens. Suite now 22 cases.
- 2026-06-12 — **Custom-formula banner** (Bruno's ask during feature-4 review): the gear
  state was invisible — now the visitor's own non-default formula gets the shared-banner
  treatment (same surface/chips, home only, factory "Reset to default"). Detection = the
  codec ("default iff encodes to bare v1"). Filters/sort excluded (visible in their own
  controls). Precedence: shared banner > custom strip > none; adopt hands over from one to
  the other.
- 2026-06-12 — **Shared-banner Reset semantics corrected** (Bruno's repro: sharer's stored
  formula == the shared one, so "restore stored" looked like only-the-sort reset). Reset
  now = the default SITE in one click (factory formula persisted + board remount clearing
  the link's filters/sort), per the mock's locked caption. Accepted trade-off: a tuned
  visitor clicking Reset on someone's link loses their tuning — viewing never destroys,
  the explicit click does. Supersedes the feature-4 entry's "restores the visitor's
  stored formula".
