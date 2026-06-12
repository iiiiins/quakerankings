# Feature 4 — Shareable rankings + top-10 share card

Session 2026-06-12. Spec: docs/ROADMAP.md §4 + docs/mocks/shareable-rankings-walkthrough.html.
Build + verify against dev preview; NO deploy without Bruno's "ship it".

## Design decisions (made this session, within roadmap constraints)

- **Single versioned param** `#/?f=v1.<segments>` — one opaque token, version governs the
  whole blob. Dot-separated segments, canonical order, omit-at-default (a bare `v1` = pure
  default board, legal).
- **Share icon home-only**: the link always targets the home board; sharing from /events or
  /charts has no defined meaning. Icon renders left of the gear (mock position), only on `/`.
- **No continuous URL sync**: the link is built on demand in the popover (mock step 1 shows a
  bare URL while tuning). Avoids history spam and router fights.
- **Search / column sort / pager are NOT in the contract** — view conveniences, not the
  ranking. Filters (game, mode, years, LAN, power) + full formula are.
- **Shared view = defaults + link overrides** (localStorage ignored entirely while shared —
  omitted segment means *default*, so every visitor sees the same board).
- **While shared: formula auto-save suppressed.** Adopt = persist current state to
  localStorage + dismiss + clean URL. Reset = restore visitor's own stored formula + remount
  board (filters back to defaults) + clean URL. Tweaks while shared stay unsaved until adopt.
- **Card**: 1200×630 landscape PNG (Discord-paste size), single-column top-10, site visual
  language, drawn after document.fonts load of Orbitron/Rajdhani. Download + clipboard copy.
- **Filters reach the header share popover via a ref mirror** (PlayerList pushes its filter
  state up through onFiltersChange; popover reads the ref when opened — popover blocks
  filter interaction while open, so a ref is race-free). ShareMenu recomputes the top-10
  itself via useTournaments + computeRankings (same pure pipeline as the board).

## URL schema v1 (public contract — goes in CLAUDE.md at ship)

```
#/?f=v1[.<segment>]*          segments in canonical order, each omitted at default
p<n>-<n>-<n>-<n>              base points first-second-top4-top8      p150-75-30-10
hp<c>[-<c>]                   hidden placements  c ∈ 1|2|4|8          hp4-8
t<n>-<n>-<n>-<n>-<n>          tier weights 1→5                        t100-80-50-25-10
ht<c>[-<c>]                   hidden tiers       c ∈ 1..5             ht4-5
g<code>_<n>[-<code>_<n>]      game weights ≠ 100                      gql_120-qc_80
hg<code>[-<code>]             hidden games                            hgdb
m<code>_<n>[-<code>_<n>]      mode weights ≠ 100                      mtdm_50
hm<code>[-<code>]             hidden modes                            hmsac-wip
e<n>                          minEventsForPpe ≠ 15                    e10
fg<code>                      game filter ≠ All                       fgq3
fm<code>                      mode filter ≠ All                       fmduel
y<from>-<to>                  year range ≠ 1996–current               y2003-2013
l                             LAN only
w                             Power Ranking

games: qw q2 q3 q4 ql qc db   modes: duel 2v2 tdm ctf ca sac wip dbt
```

Decode: no `v1` prefix → null (not a shared view). Unknown segment/code → skipped leniently
(forward compat: vocabulary may grow, grammar may not). Weights/points clamped [0, 100000];
years clamped [1996, current], swapped if from>to. Decode returns COMPLETE config + filters.

## Steps

- [x] 1. Extract `src/lib/formulaDefaults.js` — commit `7e6628e`. Verified: board identical
       (1,690 players · 1,925 tournaments · 0 filtered), no console errors; the pre-refactor
       localStorage formula matched the extracted defaults key-for-key (identity cross-check).
- [x] 2. `shareCodec.js` + `shareCodec.test.js` — commit `7661402`. 19/19 green (first test
       suite in the repo). Round-trips, canonical order, omit-defaults, leniency, clamping,
       chip summaries all pinned.
- [x] 3. Share popover — commit `bb2e0d0`. Verified in preview: LAN+Power → `#/?f=v1.l.w`
       with matching chips; FIRST=150 + Tier-4 hidden → `v1.p150-50-25-10.ht4`; icon absent
       on /events; popover visuals match the design system (screenshot).
- [x] 4. Shared-view mode — commit `983b3d5`. Verified both entry paths (boot + hashchange)
       and both exits against a seeded stored formula (first=99): banner + mock chips exact;
       shared board = defaults + link (settings showed 100, not 99); storage untouched while
       viewing; Reset restored 99 + default board + clean URL; Adopt kept the view, persisted
       the shared formula, cleaned the URL; post-adopt reload = adopted formula + default
       filters.
- [x] 5. Share card — commit `c1aca29`. Verified: 1200×630 render, full-size screenshot
       matches the site language (medal ranks, Orbitron names, placement counts, point bars,
       chips, counts footer); popover link round-trips the opened URL exactly; empty-formula
       state shows an honest note; clipboard rejection falls back to "use Download"; download
       click clean; clean-pass console: zero new warnings/errors.
- [x] 6. Docs: CLAUDE.md (v1 contract section, structure, state architecture, known-issue
       note), ROADMAP.md (§4 status BUILT + decision-log entry). Tests 19/19, prod build
       green. NOT deployed.

## Review

Feature 4 complete in 5 atomic commits + docs. The v1 URL schema is live as a public
contract the moment it deploys — it's pinned by the test suite and documented in CLAUDE.md;
any change to `formulaDefaults.js` or the codec must keep existing links meaning the same
thing (bump to v2 for shape changes).

Build-time decisions (all logged in the roadmap): single versioned `f` param; share icon
home-only; no live URL sync (link built on demand); search/sort/pager excluded from the
contract; shared view suppresses formula-memory until adopt; adopt keeps the view, reset
remounts; card 1200×630 recomputed through computeRankings (card ≡ board by construction).

Deliberately NOT done: GA events on share/copy (not in scope — cheap follow-up if Bruno
wants usage signal); silencing the pre-existing no-players console.error (known issue #1,
now noted as doubled in degenerate states); era presets (backlog, ride on this encoding).

Verification gaps to try by hand in a real browser (preview browser can't): happy-path
clipboard copy (link + image) — the preview environment denies clipboard permission, so
only the fallback paths were exercised end-to-end.
