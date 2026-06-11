# Feature roadmap

Written 2026-06-11 at the end of the feature-planning session (discussion only — no code that
session). This is the handoff for the implementation sessions: **one committed feature per
session**, same model as the redesign. Read `CLAUDE.md` (repo root) first for the codebase map;
this file only covers what to build, why, and what was decided against.

How the priorities were set: Bruno's stated goal for this stretch is **depth for visitors**
(richer exploration for people already on the site) over reach or data ops; effort appetite is
open-ended, including refactor groundwork; on data work he explicitly wants real on-site admin
entry (full CRUD), not just the existing sheet+script pipeline.

## Committed features, in order

### 1. Leaderboard upgrades + foundation (~1 session) — ✅ SHIPPED 2026-06-11

All three pieces landed (commits `772d97b` refactor, `28f53b4` PPE, `5d60ef5` formula memory);
CLAUDE.md updated the same session. Build-time decisions: PPE shows a muted dash below the
min-events threshold and always sorts last; mobile got a Sort-by select (Points | Points per
event) in the bottom sheet, with the row value showing PPE while PPE-sorted; localStorage key
is `qpr.formula.v1`. Known trade-off: the 11-column table horizontally scrolls between 900 and
~1110px viewports. Deployed to production 2026-06-11 (bundle `f94633fc`, verified live).

Three pieces, one session — they all touch the same code.

- **Points-per-event column** (Bruno's own ask): a sortable points ÷ events column on the main
  leaderboard. Today per-event points exist only as per-row values on PlayerPage; there is no
  aggregate anywhere. This adds the missing axis to the GOAT debate: efficiency vs longevity
  (the 300-event grinder vs the prime monster who averaged 12 a tournament).
  - Decided 2026-06-11 (Bruno): PPE is only computed for players with a **minimum number of
    events — default 15, adjustable via a new field in the settings menu**. This kills the
    one-event-wonder problem (1 event, 1 title = huge average). Implementation detail: below
    the threshold the column shows a dash and the player sorts last under a PPE sort.
  - Mobile: the one-row list is dense (rank · name · medals · points). PPE as a sort option in
    the bottom sheet at minimum; whether it displaces a visible element is a build-time call.
- **Formula memory (A-lite)**: persist the 8 scoring-config objects (`App.js` state) to
  localStorage — load on mount, save on change, versioned key so a future schema change can
  invalidate cleanly. This is the depth-serving fragment of feature A (returning visitors keep
  their formula), deliberately decoupled from the share UI, which stays in tier 2.
- **Foundation extraction**: extract the duplicated fetch + scoring into a shared `useTournaments`
  hook and a `computeRankings` module, consumed by PlayerList and AdvancedStats. Kills known
  issues #1 (~200-line copy-paste) and #2 (dead state blocks); #3 (AdvancedStats chart
  double-init) can ride along if that code is touched anyway. Feature 2 reuses the hook.
  - After this lands, CLAUDE.md's copy-paste / dead-state sections are stale — update them in
    the same session.

### 2. Tournament browser (~1–1.5 sessions) — ✅ SHIPPED 2026-06-11 (pending deploy)

Landed in commits `9aaac5d` (browser) + `f3da4ca` (methodology rider); CLAUDE.md updated the
same session. Build-time decisions: the group key is **`Event_Name|Year|Game|Mode`**, not the
literal name+year below — a live probe found 18 name+year groups spanning multiple modes and 3
spanning games (QuakeCon divisions = separate competitions); the wider key still merges all 243
team multi-row groups → **1,385 events** from 1,925 rows. Merge rules: placement buckets union
rosters (rows by id), tier = min, LAN = OR, prize = max non-null. Filters per spec + event-name
search; no mode filter (one-line add if wanted); Top8 names omitted from the table for width
(player pages have them). Desktop columns capped with inner max-width divs so team rosters wrap
instead of stretching the table. Methodology lives at `/methodology` via a **footer link**
("How the ranking works"), not a 4th tab; it shows live dataset counts. Verified against the
dev preview (counts, merges, filters, sorts incl. prize-blanks-last, links, mobile, console)
and `npm run build`; **not yet deployed** — Bruno's "ship it" gate.

- New `/events` route: a filterable list of all ~1,925 tournaments — game / tier / year / LAN
  filters (reuse the filter-toolbar patterns), podium chips linking to player pages, prize-pool
  display.
- Why: the tournaments are the dataset and they're currently invisible except through player
  pages. A browsable events surface gives the site a second content axis, fits the
  authoritative-reference ambition, and makes the data auditable — visitors spotting a missing
  event is free data QA. It is also the natural substrate for the admin page (feature 3).
- **Data fact that shapes the build**: multi-row events are real — team modes store the same
  `Event_Name`+`Year` across multiple rows (one row per player group). The browser must group
  rows into events, not render rows raw.
- Prizepool coverage is 94% (1,801 of 1,925 rows, verified 2026-06-11 via anon query) — good
  enough to display, expect some blanks.
- **Rider: methodology page** — a short "how the ranking works" page, including how tiers were
  assigned (prize pool, era, competitiveness — Bruno's actual criteria). Cheap, and it's the
  standing answer to every "this ranking is rigged" thread.

### 3. Admin data-entry, full CRUD (~2 sessions)

The auth/RLS design, agreed in-session:

- **Auth**: Supabase email/password, **signups disabled** in the dashboard (primary control),
  single user (Bruno). Login UI on a `/admin` route.
- **RLS**: SELECT stays public (anon + authenticated). INSERT/UPDATE/DELETE require
  `authenticated` **and** `auth.uid() = '<Bruno's uuid>'` (defense-in-depth on top of disabled
  signups). The client keeps using the anon key — after login, requests carry the user JWT and
  RLS sees the role + uid. The service key stays script-only.
- Shipping admin UI in the public bundle is fine — security lives entirely in RLS, not in
  hiding the page.
- **Scope: full CRUD** (decided over insert-only): add, edit, delete from the site. The sheet +
  `npm run import` pipeline stays for bulk imports; the admin page is for one-off adds and
  corrections. Build the edit/delete flow on the tournament browser's surface (find event →
  edit).
- **Riders**: move the hardcoded Supabase URL/anon key + GA ID to env vars (known issue #4)
  while touching `supabaseClient.js`; share the validation rules (games/modes/tier 1–5/year
  range) between the admin form and `scripts/import-tournaments.js` so they can't drift.
- **Verification requirement**: after any RLS change, re-run the logged-out write probes —
  insert AND update/delete must all be rejected (the original anon-insert 401 probe only
  covered insert).

## Tier 2 backlog (interested, unordered)

- **Career comparison page** — two career panels side by side (titles per game, GF rate, career
  span, PPE) + overlaid points-over-time chart + a meetings record: events where both placed
  top-8 and who finished higher. Placements only — the data supports this. **Naming matters**:
  frame as "Compare careers", NOT "VS"/"head-to-head" — no match data exists and Quakers would
  expect real H2H results. Bruno: interested, revisit after the committed three.
- **Records page** — most titles, per-game GOATs, tier-1 title counts, longest career span, GF
  conversion (min-N), biggest prize-pool events won. Twist: recomputes under the visitor's
  formula. ~1 session once the extraction exists.
- **Full shareable rankings (feature A)** — fully spec'd in
  `docs/mocks/shareable-rankings-walkthrough.html`; the header reserves the share-icon slot.
  The URL encoding becomes a permanent public contract the moment links hit Discord — version
  it and omit defaults. Known cap on the payoff: OG previews stay generic for all links (the
  hash fragment never reaches a server on GH Pages + HashRouter).
- **Rank-over-time / "who was #1" timeline** — per-year rank under the current formula; a
  timeline strip of #1s falls out nearly free once rank-over-time exists.
- **B2-lite public intake** — Google Form → sheet tab → the existing import script as the
  review queue. Zero auth, zero new infra. The escape hatch if community submissions ever
  matter.
- **Era presets** — canned share links ("the golden era 2003–2013") once feature A exists.
- **Embed widget** (iframe top-10 for forums/streams), **CSV export** of the current ranking.

## Rejected / parked, with rationale — don't relitigate without new information

- **Prize-pool weighting in the scoring formula** — rejected: Bruno's tiers already encode
  prize pool (plus era and competitiveness), so a prizepool weight would double-count what Tier
  prices in. Prizepool stays as *display* data (browser, records).
- **Era explorer as a standalone feature** — the year filter already covers most of it; the
  differentiated remainder becomes era presets after feature A.
- **B2 full (in-app submission form + review queue + RLS for anon writes)** — premature at
  current traffic; B2-lite above does the job with zero new infra.
- **BrowserRouter migration** — infra, not depth. It is the only path to per-page link previews
  and Google indexing (HashRouter fragments never reach any server), so revisit if reach
  becomes the goal — but it risks every existing `#/` link and needs the GH Pages 404 trick.

## Cross-cutting constraints

- Static hosting (GitHub Pages), no server. Everything is client-side or Supabase. The anon key
  is read-only today; feature 3 changes the write story via RLS only.
- The design system is fixed post-redesign: new surfaces (browser, admin, methodology) must
  drop into the hybrid theme — `src/theme.js` + the `App.css` design-system classes; visual
  target `docs/mocks/direction-hybrid.html`. See `docs/REDESIGN.md` for the brief.
- Player names are stored lowercase in Supabase; `eq` queries depend on it.
- One feature per implementation session; if a session drifts or runs long, stop and hand off
  fresh (the redesign's working model).

## Decision log

- 2026-06-11 — Session interview: goal = depth for visitors; appetite = whatever it takes
  (refactor groundwork in scope); data work = real B1 with full CRUD. Reach features demoted
  accordingly.
- 2026-06-11 — Committed order locked: leaderboard upgrades + foundation → tournament browser
  (+ methodology rider) → admin full CRUD. Records stays tier 2; A-lite (localStorage formula
  memory) rides along in session 1.
- 2026-06-11 — Comparison page kept tier 2 with the "Compare careers" framing after discussing
  the no-match-data concern; prize-pool weighting rejected (tiers already encode it).
- 2026-06-11 — Bruno: PPE only for players with ≥ N events, N default 15 and adjustable in the
  settings menu (kills one-event wonders). Implemented in `computeRankings` (`minEventsForPpe`).
- 2026-06-11 — Feature 1 shipped (extraction + PPE + formula memory). Session model held:
  three atomic commits, each verified in the dev preview before landing.
- 2026-06-11 — Feature 2 built (browser + methodology). Group key widened to include Game+Mode
  after a data probe showed name+year merges distinct competitions (18 multi-mode / 3
  multi-game cases); roadmap's team-row fact fully handled (243 groups merged, 1,385 events).
  Feature 3 note: the admin "find event → edit" flow can reuse `groupEvents` + the browser
  surface as planned, but edits target the underlying *rows* — the browser groups them.
