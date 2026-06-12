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

- [ ] 1. Extract `src/lib/formulaDefaults.js` (9 default objects + GAMES/MODES/CURRENT_YEAR
       + default filters); App.js + PlayerList consume. Pure refactor.
       → verify: board renders identically in preview (same summary-line counts), HMR clean.
- [ ] 2. `src/lib/shareCodec.js` (encode / decode / summarize chips) +
       `src/lib/shareCodec.test.js` (round-trips, omit-defaults, leniency, clamping, chips).
       → verify: CI=true npm test green. First test file in the repo.
- [ ] 3. Share popover: `components/ShareMenu.js`, header share icon (home-only, left of
       gear), PlayerList onFiltersChange mirror. Link box + copy + customization chips.
       → verify in preview: tweaked settings/filters produce the right link; copy feedback.
- [ ] 4. Shared-view mode: boot parse from hash, config init from shared, banner
       (`components/SharedBanner.js`) with adopt/reset, save suppression, hashchange
       handler, boardKey remount, URL cleanup via replaceState.
       → verify in preview: open share link fresh → board + banner + filter UI match;
         adopt persists to localStorage + cleans URL; reset restores prior formula;
         visitor's stored formula untouched while merely viewing.
- [ ] 5. Share card: `lib/renderShareCard.js` (canvas draw) + card section in ShareMenu
       (preview img, Download PNG, Copy image; fonts awaited before draw).
       → verify in preview: preview img renders (dataURL length + screenshot), download
         triggers, copy guarded with fallback message.
- [ ] 6. Docs + wrap: CLAUDE.md (schema as public contract, project structure, state
       architecture, share lifecycle), ROADMAP.md (feature 4 built/verified, awaiting
       "ship it"), final `npm run build` green. NO deploy.

## Review

(filled at end of session)
