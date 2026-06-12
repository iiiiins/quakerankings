# CLAUDE.md

Regenerated 2026-06-11 from a full source read; updated the same day after the leaderboard-upgrades session (roadmap feature 1), the tournament-browser session (feature 2), and the admin-CRUD session (feature 3); updated 2026-06-12 after the sharing session (feature 4), the community-submissions session (feature 5), and the records session (feature 6). Every claim below was verified against the code on those dates.

## Overview

Quake Player Rankings is a single-page React app that aggregates competitive Quake tournament results across the franchise (Quake World through Champions, plus Diabotical) into a weighted player ranking. Users tune the scoring formula in real time — placement-point values, per-game / per-tier / per-mode weights, and visibility toggles for each — and the leaderboard recomputes client-side against a Supabase-backed tournament dataset; the formula persists across visits in localStorage. Filters cover game, mode, year range, LAN-only, and a "Power Ranking" mode (top-25 tournaments per player). The formula + home filters are also shareable as a versioned URL (`#/?f=v1…` — see Share links) that reproduces the exact board for anyone; viewers get a banner to adopt or dismiss it, and the share popover renders a top-10 PNG card for chats whose link previews can't see the formula. Players drill down to a per-player detail page; an Advanced Stats page renders points-over-time line charts. A tournament browser at `/events` lists the full dataset as grouped events (filters, podium links, prize pools), and a methodology page (footer link) is the standing "how the ranking works" answer. A records page at `/records` (4th header tab) shows all-time records — most titles overall and per game, tier-1 titles, grand-final conversion, career span, events attended, biggest prize pools won — and the records recompute under the visitor's formula: gear weights and visibility toggles apply (a hidden game's titles don't count while hidden), while home-board filters never do; the page's one own control is a LAN Only plate that flips every record (prize card included) to LAN-world. A single-user admin (`/admin`, no nav tab) adds tournaments; signed-in sessions edit/delete rows from the events browser. Signed-out visitors can suggest a fix on any event row or submit a missing tournament — both land in a `Submissions` review queue invisible to the public (anon INSERT only); `/admin` lists the pending queue with a per-field diff for corrections and approve/reject actions. Security lives entirely in Supabase RLS, not in hiding the page.

## Stack

- **React 19.0** + **react-scripts 5.0.1** (Create React App). React 19 with CRA 5 is unofficial — `.npmrc` has `legacy-peer-deps=true` so `npm install` resolves.
- **Routing**: `react-router-dom` 7.x using `HashRouter`. Deploy path is `https://iiiiins.github.io/quakerankings/#/...`. Seven routes.
- **UI**: `@mui/material` 6.3 + `@mui/icons-material` 6.3. Full custom theme in `src/theme.js` (2026-06-11 redesign: ember `#e05a1f` primary on warm gunmetal surfaces, Rajdhani UI type, component styleOverrides); design-system classes (medal headers/lanes, podium, plates, mobile rows) live in `App.css`. The fixed visual target is `docs/mocks/direction-hybrid.html` — compare against it before changing styles (full brief: `docs/REDESIGN.md`). Emotion is the MUI peer dep.
- **Backend**: Supabase (`@supabase/supabase-js` 2.47) — a `Tournaments` table plus a `Submissions` review-queue table (feature 5). Tournaments: public reads via anon role, writes require the signed-in admin; Submissions: anon may only INSERT pending rows (honeypot + caps enforced in the DB), only the admin uid can read/update/delete (email/password auth, signups disabled, uid-scoped RLS — see Data model). URL + anon JWT + GA id come from the committed `.env` (`REACT_APP_*`, public by design); secrets (service key, admin credentials) live in the gitignored `.env.local`.
- **Charts**: `chart.js` 4.x + `react-chartjs-2` 5.x. Only `Line` is used; scales/elements registered at the top of `AdvancedStats.js`.
- **Analytics**: `react-ga4` with GA property `G-X11M9568HY`, initialized at module load in `App.js`; `AnalyticsTracker` fires a pageview on each route change.
- **Tests**: jest via `react-scripts test` (`$env:CI="true"; npm test -- --watchAll=false`). Two suites: `src/lib/shareCodec.test.js` — 22 cases pinning the share-URL public contract (a failure there means links in the wild change meaning) — and `src/lib/computeRecords.test.js` — 12 cases pinning the records rules (visibility flow-through, GF min-N guard, inclusive spans, prize-event filtering) through the real computeRankings + groupEvents pipeline.
- **Hosting**: GitHub Pages, served from the `gh-pages` branch. `main` holds source.

## Project structure

```
src/
├── index.js                       createRoot mount under <StrictMode>
├── App.js                         header (wordmark/NavTabs/share/gear), footer, popovers, <Routes>;
│                                  owns scoring config + shared-view state (boot parse, hashchange,
│                                  adopt/reset, save suppression) + the home-filters ref mirror
├── App.css                        2 font imports (Rajdhani + Orbitron) + page atmosphere + design-system classes
├── theme.js                       the MUI theme — ember palette, typography, component styleOverrides
├── AnalyticsTracker.js            GA pageview on each navigation (useLocation effect)
├── components/
│   ├── PlayerList.js              "/" route. Renders top-3 podium + leaderboard (sort/filter/search,
│   │                              LAN-only + Power Ranking plates, Pts/Event column, scroll-to-bottom
│   │                              pager +100 rows) from useTournaments + computeRankings; search/sort
│   │                              are derived memos on top of the ranked list. Below 900px
│   │                              (useMediaQuery) it renders the mobile podium + chip rail + bottom-sheet
│   │                              Drawer (filters + Sort-by select) + one-row player list instead
│   ├── PlayerPage.js              "/players/:playerName". Per-player history; runs its own filtered
│   │                              supabase .or() query against the URL slug
│   ├── AdvancedStats.js           "/charts" route. Player picker + chart.js <Line> of points over time,
│   │                              fed by the same useTournaments + computeRankings pipeline
│   ├── EventsBrowser.js           "/events" route. Filterable grouped-event table (game/tier/year/LAN
│   │                              + name search, sortable year/event/tier/prize, medal podium columns
│   │                              linking to player pages, scroll pager). Mobile: chip rail +
│   │                              bottom sheet + two-line rows. Scoring-config independent — no props.
│   │                              Trailing action per row: signed-in desktop = edit pencil, signed-out
│   │                              = suggest-a-fix (desktop + mobile); summary line carries the
│   │                              "+ Submit a tournament" entry (signed-out only)
│   ├── RecordsPage.js             "/records" route (4th header tab). Seven all-time record cards
│   │                              (titles overall + per game, tier-1 titles, GF conversion,
│   │                              career span, events attended, biggest prize pools won) that
│   │                              recompute under the gear config via computeRankings with
│   │                              NEUTRAL filters — no home-board state; the one page-local
│   │                              control is a LAN Only plate (flips the prize card too);
│   │                              record rows link to /players/:name
│   ├── Methodology.js             "/methodology" route (footer link). Static how-it-works cards +
│   │                              live result/event counts from useTournaments
│   ├── AdminPage.js               "/admin" route (no nav tab — direct URL). Login card → signed-in
│   │                              shell: review queue + add-tournament form + sign-out (force-clears
│   │                              zombie sessions whose server side was revoked elsewhere)
│   ├── TournamentForm.js          one form for add + edit + suggest: 15 row fields, shared validation,
│   │                              soft duplicate warning ("Add anyway"), prefill/dupCheck props,
│   │                              children slot for extra grid fields (the suggest extras)
│   ├── EventEditDialog.js         the browser's edit surface: single-row events open the form,
│   │                              team events get a row picker + add-row-to-event; closes on save
│   ├── SuggestDialog.js           the public submission surface: correction (prefilled form; team
│   │                              events pick a raw row first) or new tournament, plus reviewer
│   │                              note / handle / offscreen honeypot; writes only to Submissions
│   ├── SubmissionQueue.js         /admin pending queue: FIX/NEW badges, note+handle, per-field diff
│   │                              vs the LIVE row for corrections (missing target disables approve),
│   │                              payload re-validation gate; approve applies via tournamentWrites
│   │                              then marks approved, reject just marks
│   ├── SettingsMenu.js            controlled form in the gear popover; five sections (Points, Games,
│   │                              Tier, Mode — rows = visibility checkbox + weight input — and
│   │                              Points per Event with the min-events threshold)
│   ├── ShareMenu.js               share-popover content: v1 link (built on demand) + copy, chips,
│   │                              top-10 card preview with Download PNG / Copy image; recomputes the
│   │                              top-10 via useTournaments + computeRankings so card = board
│   ├── SharedBanner.js            "viewing a shared custom ranking" banner (home only): chips from
│   │                              the decoded link + Keep this formula / Reset to default
│   └── CustomFormulaBanner.js     "using a custom formula" strip (home only, when no shared view):
│                                  same chips for the visitor's own non-default formula + a factory
│                                  Reset; self-detects via encode === "v1" against default filters
├── hooks/
│   ├── useTournaments.js          shared fetch hook; module-level cache = one table fetch per
│   │                              session; refreshTournaments() drops the cache after admin writes
│   │                              and pushes fresh data to all mounted consumers
│   └── useSession.js              mirrors the Supabase auth session into React state
├── lib/
│   ├── computeRankings.js         the pure scoring/filter/rank pipeline both list pages consume
│   ├── groupEvents.js             pure rows→events grouping for the browser (see Data model note);
│   │                              each event also carries its raw DB rows for the admin editor
│   ├── computeRecords.js          pure records derivation over computeRankings output (visibility
│   │                              pre-applied) + groupEvents for the prize list (game/tier/mode
│   │                              visibility applied here); top-5 lists, MIN_GRAND_FINALS guard,
│   │                              ties broken by points then name (+ .test.js — 12 cases through
│   │                              the real pipeline)
│   ├── tournamentRules.js         shared validation rules (web form + import script) — CommonJS,
│   │                              and it must stay free of babel-helper syntax (see quirks)
│   ├── gameLogos.js               the Game-string → logo PNG map (PlayerList + EventsBrowser)
│   ├── formulaStorage.js          load/save the scoring config, versioned key qpr.formula.v1
│   ├── sortPlayers.js             column sort + formatPpe shared by the board and the share card
│   ├── formulaDefaults.js         single source of truth for default formula + filters (and the
│   │                              GAMES/MODES lists, YEAR_MIN, CURRENT_YEAR); part of the share
│   │                              contract — changing a default changes what existing links decode to
│   ├── shareCodec.js              encode/decode/summarize for the v1 share URL (+ .test.js — the
│   │                              contract tests; run them before touching either file)
│   └── renderShareCard.js         1200×630 canvas top-10 card in the site visual language; awaits
│                                  Orbitron/Rajdhani via document.fonts before drawing
├── services/
│   ├── supabaseClient.js          client from .env config (REACT_APP_SUPABASE_URL / _ANON_KEY)
│   ├── fetchPlayersByGame.js      fetchListTournaments — full Tournaments table, [] on error
│   ├── tournamentWrites.js        insert (max-id+1) / update / delete; turns RLS silent no-ops
│   │                              (0 rows affected) into visible errors
│   └── submissions.js             public submitSuggestion (anon INSERT, no .select — anon has no
│                                  SELECT grant; honeypot short-circuits to fake success) + admin
│                                  fetchPendingSubmissions/setSubmissionStatus + rowFromPayload
│                                  (rebuild from known columns only — payloads arrive via an
│                                  endpoint open to anon; never spread one into a write or JSX)
└── logos/                         per-game PNGs + footer X/Twitch logos

scripts/                           plain node (loadEnv reads .env.local then .env)
├── import-tournaments.js          bulk import from the Google Sheet tab (validates via
│                                  src/lib/tournamentRules); writes need SUPABASE_SERVICE_KEY
├── create-admin-user.js           idempotent admin-user creation via service key; emits
│                                  setup-admin.sql with the uid baked in
├── setup-admin.sql                the live RLS policy set (drops ALL policies first — a legacy
│                                  any-authenticated-INSERT policy had to die); paste in SQL editor
├── setup-submissions.sql          Submissions table + grants + policies (feature 5), idempotent;
│                                  admin uid hardcoded — must match setup-admin.sql. Paste in SQL
│                                  editor (ran 2026-06-12)
├── probe-rls.js                   write-access probes: Tournaments (anon writes + public signup
│                                  must reject) AND Submissions (anon INSERT-pending allowed;
│                                  non-pending/honeypot/over-cap/read/update/delete rejected);
│                                  --full adds signed-in admin CRUD on marker rows in both tables.
│                                  Run after ANY auth/RLS change (20/20 on 2026-06-12).
└── env.js                         shared env loader for the admin/probe scripts
```

## Data model (Supabase `Tournaments` table, inferred from code)

One row per tournament. Columns read by the app:

| Column | Type | Notes |
|---|---|---|
| `id` | number | React row key on PlayerPage |
| `Event_Name` | string | display name |
| `Game` | string | exact strings: `Quake World`, `Quake 2`, `Quake 3`, `Quake 4`, `Quake Live`, `Quake Champions`, `Diabotical` |
| `Mode` | string | `Duel`, `2v2`, `TDM`, `CTF`, `CA` (Clan Arena), `SAC` (Sacrifice), `WIP` (Wipeout), `DBT` (Diabotical multi-mode) |
| `Tier` | number 1–5 | 1 = most prestigious |
| `Year` | number | |
| `LAN` | boolean | |
| `Prizepool` | number \| null | display-only (never a formula input); ~94% coverage (1,801/1,925 rows, verified 2026-06-11) |
| `1st` … `8th` | string \| null | one player name per slot |

Rows missing `Game`, `Mode`, `Tier`, or `Year` are skipped with a `console.error`. Placement buckets: 1st, 2nd, Top4 (= 3rd+4th), Top8 (= 5th–8th).

**Multi-row events**: team modes store one row per player group under the same `Event_Name`+`Year`+`Game`+`Mode` (e.g. a CTF event = one row per roster slot, the union of rows giving every player on each placing team). `lib/groupEvents.js` merges those into single events for the browser — placement buckets union the names (rows ordered by `id`), tier = min, LAN = OR, prizepool = max non-null. The group key deliberately includes `Game`+`Mode`: the same `Event_Name`+`Year` legitimately spans modes/games (18/3 cases — QuakeCon divisions), which are separate competitions. 1,925 rows → 1,385 events (verified 2026-06-11).

PlayerPage queries with `eq` on the **lowercased** URL slug (`1st.eq.<name>`); Postgres `eq` is case-sensitive, so this only matches if DB names are stored lowercase. Client-side comparisons lowercase both sides. The shared `tournamentRules.normalizeRow` lowercases placement names on every write path (admin form + import script) to keep this invariant. **Player names are also an alias canon**: the same player appears on source sites under variant spellings ("s v h" vs the DB's "svh", "coffee by tomo" vs "tomo", "nph_" vs "speedball") — any bulk data-fill must cross-check candidate names against the existing distinct-player list before submitting, or the ranking silently splits one career across two names (2026-06-12 fill: the one researcher prompted without this check produced 2 wrong aliases).

**Write access (since 2026-06-11)**: RLS on `Tournaments` — public SELECT; INSERT/UPDATE/DELETE require the `authenticated` role AND `auth.uid()` = the single admin uid (`scripts/setup-admin.sql` is the live policy set). Signups are disabled in the dashboard (primary control); the uid scope is defense-in-depth. `id` has no DB default — both write paths insert with max-id+1. After ANY auth/RLS change, re-run `node scripts/probe-rls.js --full` (8/8 on 2026-06-11; 20/20 incl. the Submissions probes on 2026-06-12). Note: blocked UPDATE/DELETE surface as 0-affected-rows, not errors — both the probe and `tournamentWrites.js` account for that.

### `Submissions` table (feature 5, created 2026-06-12 via `scripts/setup-submissions.sql`)

One row per community suggestion: `id` (identity — the DB must assign it: anon has no SELECT, so the Tournaments max-id+1 scheme is impossible), `created_at`, `type` (`new` | `correction`), `target_id` (Tournaments row id for corrections; **no FK** — Tournaments.id has no unique constraint; the queue warns and disables approve when the target is gone), `payload` jsonb (the full proposed row in Tournaments column shape, pre-normalized by the form), `note` (≤ 500), `handle` (≤ 40), `status` (`pending`/`approved`/`rejected`), `website` (the honeypot — humans never see the field).

The spam posture is enforced in the DB, not the client: length caps are CHECK constraints; the INSERT policy's WITH CHECK requires `status = 'pending'` AND an empty honeypot (bot rows are rejected, not stored — the client additionally fakes success without calling the API when the trap is filled); and the anon grant is **column-level** (type, target_id, payload, note, handle, website) after a revoke of Supabase's default table-wide grant, so anon physically can't supply `id`/`created_at`/`status`. No anon SELECT at all — submissions are invisible until reviewed; the admin uid gets SELECT/UPDATE/DELETE. Queue-side, payloads are treated as untrusted: rebuilt from known columns (`rowFromPayload`), re-validated with `validateRow` before approve enables, and only string-coerced values are rendered.

## Scoring model

Computed client-side on every settings/filter change (no server-side aggregation):

```
points(placement) = base[placement] × tierWeight/100 × gameWeight/100 × modeWeight/100
```

- Defaults: base = {1st: 100, 2nd: 50, Top4: 25, Top8: 10}; tier weights = {1: 100, 2: 60, 3: 35, 4: 20, 5: 10}; all game and mode weights = 100.
- Visibility toggles remove a placement bucket / game / tier / mode from scoring entirely.
- **Power Ranking**: per player, keep only the top-25 tournaments by points and recompute points/placements/participations (`POWER_RANKING_LIMIT` in `computeRankings.js`). The kept top-25 also replaces `player.tournaments`, so AdvancedStats charts plot exactly the events the power points come from.
- **Points per event** (`player.ppe`): `points / participations`, computed in `computeRankings` only for players with at least `minEventsForPpe` events (default 15, adjustable in the settings menu); below the threshold it is `null` — rendered as a muted dash and always sorted last in either direction. Desktop: sortable Pts/Event column between Events and Points. Mobile: Sort-by select (Points | Points per event) in the bottom sheet; the row's trailing value shows PPE while PPE-sorted, and the top-3 rejoin the list whenever the order isn't the default points ranking.
- PlayerPage computes the same formula written as `(base × tierW × gameW × modeW) / 1000000` — mathematically equivalent; don't "fix" one to match the other without reading both. It rounds to 1 decimal where the list pages round to integers.
- PlayerPage extras: average placement (1st=1, 2nd=2, Top4=3.5, Top8=6.5), grand finals = 1st+2nd count, grand-final win rate = 1sts / grand finals.

## Share links — the v1 public URL contract (since 2026-06-12)

`#/?f=v1[.<segment>]*` — the params live **inside the hash fragment** (HashRouter; parse `window.location.hash`, never `location.search`). Implemented in `lib/shareCodec.js`; `lib/shareCodec.test.js` pins everything below. **The v1 grammar is permanent once links circulate**: the code vocabulary may grow (new games/modes), the grammar may not; bump to `v2` for shape changes and keep decoding v1. Defaults (`lib/formulaDefaults.js`) are part of the contract — an omitted segment decodes to the DEFAULT (never the viewer's stored value), so the same link shows the same board to everyone, and changing a default silently changes what existing links decode to.

```
p<n>-<n>-<n>-<n>          base points first-second-top4-top8      p150-75-30-10
hp<c>[-<c>]               hidden placements  c ∈ 1|2|4|8          hp4-8
t<n>-<n>-<n>-<n>-<n>      tier weights 1→5                        t100-80-50-25-10
ht<c>[-<c>]               hidden tiers       c ∈ 1..5             ht4-5
g<code>_<n>[-<code>_<n>]  game weights ≠ 100                      gql_120-qc_80
hg<code>[-<code>]         hidden games                            hgdb
m<code>_<n>[-<code>_<n>]  mode weights ≠ 100                      mtdm_50
hm<code>[-<code>]         hidden modes                            hmsac-wip
e<n>                      minEventsForPpe ≠ 15                    e10
fg<code>                  game filter ≠ All                       fgq3
fm<code>                  mode filter ≠ All                       fmduel
y<from>-<to>              year range ≠ 1996–current               y2003-2013
l                         LAN only          w                     Power Ranking
s<code>                   ranking sort ≠ points (desc implied)    sppe

game codes: qw q2 q3 q4 ql qc db · mode codes: duel 2v2 tdm ctf ca sac wip dbt
sort codes: ppe (Pts/Event)
```

Segments are dot-separated in the canonical order above and omitted at default (a pure-default board encodes as bare `v1`). Decoding is **lenient**: unknown segments/codes are skipped, malformed segments fall back to defaults, weights clamp to [0, 100000] ints, years clamp to [1996, current] and swap if reversed — any v1 link always produces a board. Deliberately **not** in the contract: search query, pager, and non-ranking sorts. The line for sorts: a sort is shareable iff "top 10 by X" reads as a leaderboard — today that's Pts/Event descending only; ascending/stat-column/alphabetical sorts canonicalize to the points order ("most titles" boards belong to the records page, feature 6). The share popover renders the **canonical** state (encode→decode) so chips + card always show what the link opener will see. Era presets (backlog) are just curated instances of these links.

**Shared-view lifecycle** (`App.js`): a link is parsed at boot (module scope) and on `hashchange` (pasting a link into an open tab). While `shared` is active: formula state = the decoded link, localStorage is ignored AND the formula-memory save effect is suppressed — merely viewing never overwrites the visitor's formula. PlayerList receives the link's filters as `initialFilters` (state initializers) and is remounted via a `key` bump when they must re-derive (reset, or a new link arriving). Exits: **Keep this formula** (clears `shared`; the save effect re-fires and persists what's on screen; the current view stays) or **Reset to default** (the default SITE in one click: factory formula — persisted — plus a board remount that drops the link's filters and sort; deliberately NOT "back to your stored formula", because a sharer's stored formula is the shared one and reset then looked like a no-op). Both strip the `f` param via `history.replaceState` so a reload stays out of shared view. The share popover itself is home-route-only (`ShareControl` in App.js) and builds the link on demand — the address bar is never rewritten while tuning.

**Custom-formula banner**: when no shared view is active and the visitor's own formula ≠ defaults, the same banner surface shows "You're using a custom formula" with the formula chips and a factory **Reset to default** (sets the 9 config states to defaults; the save effect persists them — the old tuning is gone, there is no undo). Filters/sort are excluded by design (their state is visible in the controls). Adopting a shared formula hands the shared banner over to this strip. Banner precedence: shared > custom > none.

`App` owns the **scoring configuration** (8 objects: `pointsConfig`/`pointsVisibility`, `gameWeights`/`gameVisibility`, `tierWeights`/`tierVisibility`, `modeWeights`/`modeVisibility`, plus `minEventsForPpe`) and passes values + setters to `<SettingsMenu>` (the only edit point) and values to the pages that consume them. The whole set persists via `lib/formulaStorage.js` (**formula memory**): saved to localStorage on every change, loaded at page load with each stored section spread over its defaults (so formulas saved before a new game/mode/setting still load), versioned key `qpr.formula.v1` — bump it to invalidate stale shapes. Corrupt or unavailable storage falls back to defaults silently. Defaults live in `lib/formulaDefaults.js`. A share link overrides all of this at boot and suppresses saving until adopted (see Share links).

**Filter state is per-page, not shared.** Each list page declares its own `selectedGame`, `selectedMode`/`selectedTier`, `yearRange`, `lanOnly` (PlayerList also `powerRanking`); changing a filter on one page does not affect another. Two share-feature exceptions that keep this ownership intact: PlayerList **mirrors** its filters + ranking sort up through `onFiltersChange` into an App-held ref (read by the share popover when it opens — an open popover blocks filter interaction, so the ref can't go stale while visible), and accepts `initialFilters` (including `sortBy`) from a share link as state initializers.

Data flow per page:
- `PlayerList` and `AdvancedStats` read the table through `useTournaments()` (module-level cache — one Supabase fetch per session, shared across pages; empty/error results aren't cached so a later mount retries) and run `computeRankings(tournaments, config)` in a `useMemo`. PlayerList layers search + column sort on top as derived memos, so sort survives searches and settings changes; `Rank` is always the points-desc rank regardless of the displayed order.
- `EventsBrowser` and `Methodology` use the same hook but run `groupEvents` instead — they show raw data and take **no scoring-config props**; the settings gear doesn't affect them.
- `RecordsPage` takes the full scoring config (the 9 props, PlayerList-style) and runs `computeRankings` with neutral filters (All games/modes, full year range, no Power Ranking), then `computeRecords` (+ `groupEvents` for the prize card). Home-board filters deliberately never reach it; its single page-local control is a LAN Only plate whose state feeds both `computeRankings` (player records) and `computeRecords` (prize list).
- `PlayerPage` builds its own filtered Supabase query per visit.

**Auth/admin flow**: `useSession` mirrors the Supabase session (persisted in localStorage by supabase-js; survives reloads). `/admin` hosts login + the review queue + the add form; `EventsBrowser` shows a pencil column when signed in on desktop (mobile rows stay read-only) opening `EventEditDialog`. The editor edits **raw rows**, not grouped events — single-row events open the form directly, team events go through a row picker. Every successful write calls `refreshTournaments()` (cache drop + push to all mounted consumers) and closes the dialog; the open dialog re-derives its event by group key, so an edit that changes the key just closes it. The admin UI ships in the public bundle on purpose — RLS is the gate.

**Community submissions flow (feature 5)**: signed-out only — one rule: signed-out = suggest, signed-in = edit (an authenticated session can't INSERT under the anon-only policy, so the suggest affordances hide when a session exists). `SuggestDialog` reuses `TournamentForm` (corrections prefill the raw row; team events get the same row picker as the admin editor) plus reviewer note / handle / honeypot extras, and submits the normalized row as the `payload`. Approving in `SubmissionQueue` applies via `tournamentWrites` with the admin session (correction → `updateTournament(target_id)`, new → `insertTournament` max-id+1), then marks the submission `approved`; if marking fails after the write landed, the item shows a do-NOT-reapprove warning (a second approve would double-apply). Corrections diff against the **live** row — what approving would change today, not what the submitter saw.

Routes (all under `HashRouter`): `/` → PlayerList, `/events` → EventsBrowser, `/records` → RecordsPage, `/charts` → AdvancedStats, `/methodology` → Methodology (footer link, not a tab), `/admin` → AdminPage (no tab — direct URL), `/players/:playerName` → PlayerPage. In-app nav in `App.js` uses `window.location.hash = "#/..."` rather than `useNavigate()` — works, but bypasses the router lifecycle; NavTabs marks Home active on `/players/*` too (pre-existing behavior, kept). **Nav pattern (decided at feature 6, features 7–9 follow it)**: new top-level pages get a header tab; below 900px `.site-tabs` scrolls horizontally with a hidden scrollbar (chip-rail pattern) instead of wrapping, so added tabs cost no layout.

## Build & deploy

- `npm start` — dev server at `http://localhost:3000/quakerankings/` (path prefix comes from `PUBLIC_URL` in `.env.development.local`).
- `npm run build` — CRA production build into `build/`; `homepage` in `package.json` roots assets under `/quakerankings/`.
- `npm run deploy` — `predeploy` builds, then `gh-pages -d build` pushes to the `gh-pages` branch. Pipeline restored and exercised 2026-06-11 (first deploy since Jan 25 2025), verified against the live site.
- Production URL: `https://iiiiins.github.io/quakerankings/`.

## Recovery story (why the history looks like this)

The working source was lost locally in 2025; deploys had been going straight to `gh-pages` without commits, so `main` was ~2 weeks stale. On 2026-05-10 the source was reconstructed from the deployed build's source maps (`static/js/main.*.js.map` on `gh-pages`) and committed to `main` in one commit (`2ce69d7`). The recovered code corresponds to the **Jan 25 2025 production deploy** and is faithful to it — bugs and dead code were deliberately preserved. Everything under Known issues below ships in production today.

## Known issues / tech debt

Remaining after the 2026-06-11 fix batch (year cap, weight-fallback mismatch, Diabotical dropdown gap, debug text/log spam, favicon/manifest, medal-header `class=`, Participations sort arrow — all fixed and deployed that day), the 2026-06-11 redesign (emotion-hash selectors, serif fallbacks, fixed pixel layouts, PlayerPage's nested ThemeProvider removed; all three pages responsive), the 2026-06-11 foundation extraction (which resolved the former #1–#3: the ~200-line PlayerList/AdvancedStats copy-paste, the dead state blocks/imports, and the AdvancedStats chart double-init — all replaced by `useTournaments` + `computeRankings`), and the 2026-06-11 admin session (which closed the former #1 — hardcoded Supabase/GA config — via `.env`, and found+fixed a legacy RLS policy that let ANY authenticated user insert while signups were open).

1. **Cosmetics**: `package.json` `"name": "react"`; `public/index.html` `<title>` is "Quake Rankings" while the H1 reads "Quake Player Rankings". A no-players `console.error` still fires if user settings filter out every tournament (the on-load case stays silent; since feature 4 the open share popover runs the same pipeline, so degenerate states log it twice — and `/records` runs it too while that page is open).
2. **Narrow-desktop horizontal scroll**: with the Pts/Event column the leaderboard needs ~1060px; between 900px (the mobile breakpoint) and ~1110px viewports it scrolls horizontally inside the board (MUI `overflow-x: auto`) instead of fully fitting. The events table has the same trade-off at ~1150px content width (its name/podium columns are capped by inner `max-width` divs — without those, table auto-layout would stretch it past 1800px); the signed-in pencil column adds ~40px more, so admin sessions may scroll slightly even at 1280px.

## Local dev quirks

- `.npmrc` — `legacy-peer-deps=true`, required for React 19 against CRA 5's peer deps.
- `.env.development.local` (gitignored, create it yourself): `PUBLIC_URL=/quakerankings` so dev serves at the same path as GitHub Pages.
- Env layout: `.env` (committed) = public client config; `.env.local` (gitignored) = `SUPABASE_SERVICE_KEY`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`. CRA bakes `REACT_APP_*` at server/build start — restart the dev server after changing `.env*`.
- `src/lib/tournamentRules.js` is CommonJS (shared with the node scripts) and **must stay free of babel-helper syntax** (object spread, for-of): CRA's babel injects helper *imports* for those, flipping the file to ESM and killing `module.exports` ("module has no exports" build error). Consumers default-import the CJS interop object — CRA's `strictExportPresence` rejects named imports from CJS.
- supabase-js 2.47 `signOut()` errors **without clearing the persisted token** when the session was revoked elsewhere (e.g. a dashboard password rotation) — AdminPage's handler force-clears `sb-*-auth-token` and reloads on signOut error.
- Dev server emits two `Watchpack Error (initial scan): EINVAL` lines for `D:\Recovery` / `D:\System Volume Information` on Windows — Watchpack scans the drive root and chokes on system folders. Compile and HMR are unaffected.
- ~23 transitive-dep deprecation warnings during `npm install` — standard for `react-scripts` 5.
