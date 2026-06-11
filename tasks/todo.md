# Feature 1 — Leaderboard upgrades + foundation (roadmap.md §1)

Session 2026-06-11. One committed feature, three pieces, staged as three verifiable commits.

## Plan

- [x] **Roadmap edit (user ask)**: PPE only for players with ≥ N events, N default 15, adjustable
      in settings menu. → done in docs/roadmap.md before coding.
- [x] **Commit 1 — refactor: foundation extraction** (`772d97b`, behavior-identical)
  - [x] `src/lib/computeRankings.js` — pure scoring/filter/rank function shared by both pages.
        Power-ranking divergence unified: tournaments truncated to top 25 (AdvancedStats
        behavior — charts must match power points; PlayerList ignores it downstream).
  - [x] `src/hooks/useTournaments.js` — shared fetch hook, module-level cache (one fetch per
        session; empty/error results not cached).
  - [x] PlayerList: hook + useMemo compute; search/sort as derived memos; dead state deleted.
  - [x] AdvancedStats: hook + useMemo compute; vestigial table-sort/pager/dead state deleted;
        chart double-init fixed (single processed-players memo + one selection effect).
  - [x] App.js: dead filter states + props + fetchPlayers import removed.
  - [x] services/fetchPlayersByGame.js: only fetchListTournaments remains; [] on error.
  - [x] Verified: same totals (1,690 players / 1,925 tournaments), podium, sort asc/desc,
        search, Power Ranking (cap 25, recomputed placements), charts top-5 + painted canvas,
        zero console errors.
- [x] **Commit 2 — feat: points-per-event column** (`28f53b4`)
  - [x] computeRankings: `ppe = points/participations`, null below `minEventsForPpe`.
  - [x] App: `minEventsForPpe` state (default 15) → SettingsMenu + PlayerList.
  - [x] SettingsMenu: "Points per Event" section, "Min events" number input.
  - [x] Desktop: sortable Pts/Event between Events and Points; muted dash; nulls last both
        directions; colSpan 11.
  - [x] Mobile: Sort-by select (Points | Points per event) in sheet; trailing value = PPE when
        PPE-sorted; top-3 rejoin list when order isn't default.
  - [x] Verified: math (rapha 4650/160=29.1 ✓), dash at 11 events, threshold 50 live-drops
        fatal1ty/winz, asc starts 1.2 with no dashes first, mobile sort fatal1ty 37.4 first.
- [x] **Commit 3 — feat: formula memory (A-lite)** (`5d60ef5`)
  - [x] `src/lib/formulaStorage.js` — versioned key `qpr.formula.v1`, try/catch load/save.
  - [x] App: lazy-init from stored (per-section spread over defaults), save-on-change effect.
  - [x] Verified: minEvents 40 + Q3 weight 50 survive reload into form AND scoring; corrupt
        JSON → defaults, page alive, valid blob re-saved.
- [x] **Commit 4 — docs**: CLAUDE.md (structure, scoring/PPE, state arch + persistence, known
      issues #1–#3 closed, new #3 narrow-desktop scroll), roadmap feature 1 SHIPPED + decision
      log, this review.
- [x] Final: `npm run build` passes — bundle −900 B gzipped vs before the session.

## Review

Shipped roadmap feature 1 in four commits: docs/plan (`650f4fa`), foundation extraction
(`772d97b`, −1,027/+427 lines), PPE column (`28f53b4`), formula memory (`5d60ef5`). Every step
verified against the live dev preview before committing; production build green.

Deviations from pure parity, all deliberate and surfaced:
- Column sort now persists through searches and settings changes (was: search silently reset
  the order while the header arrow lied). Falls out of the derived-state architecture.
- Power Ranking now truncates `player.tournaments` everywhere (was: only AdvancedStats) — the
  two pages disagreed; picked the chart-consistent behavior, no PlayerList-visible effect.
- `fetchListTournaments` returns `[]` on error (was: a wrong-shaped object that logged three
  bogus "Invalid tournament entry" errors downstream).
- One Supabase fetch per session via module cache (was: one per page mount).

New trade-off accepted: 11 columns ≈ 1060px, so 900–1110px viewports scroll the board
horizontally (MUI overflow-x). Noted in CLAUDE.md known issues.

Deployed 2026-06-11 after Bruno's hands-on check ("ship it"): pre-deploy checks passed, main
pushed (`58fe0cf`), `npm run deploy` published bundle `f94633fc`, live index.html + bundle
grep verified (Pts/Event, qpr.formula.v1, Points per event, minEventsForPpe all present).
