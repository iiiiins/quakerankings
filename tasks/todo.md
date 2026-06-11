# Feature 1 — Leaderboard upgrades + foundation (roadmap.md §1)

Session 2026-06-11. One committed feature, three pieces, staged as three verifiable commits.

## Plan

- [ ] **Roadmap edit (user ask)**: PPE only for players with ≥ N events, N default 15, adjustable
      in settings menu. → done in docs/roadmap.md before coding.
- [ ] **Commit 1 — refactor: foundation extraction** (behavior-identical)
  - [ ] `src/lib/computeRankings.js` — pure scoring/filter/rank function shared by both pages.
        Unifies the power-ranking divergence: tournaments truncated to top 25 (AdvancedStats
        behavior — needed so charts match power points; PlayerList ignores it downstream).
  - [ ] `src/hooks/useTournaments.js` — shared fetch hook, module-level cache (one fetch per
        session instead of per page mount).
  - [ ] PlayerList: hook + useMemo compute; filteredPlayers derived (search+sort as pure memo);
        delete dead state (settings, topTournamentsLimit/Filter).
  - [ ] AdvancedStats: hook + useMemo compute; delete vestigial table-sort/pager/dead state;
        fix chart double-init (known issue #3) — single processed-players memo + one effect.
  - [ ] App.js: remove dead filter states + dead props + dead fetchPlayers import.
  - [ ] services/fetchPlayersByGame.js: drop dead fetchTotalTournaments + commented fetchPlayers;
        error path returns [] (was a wrong-shaped object).
  - [ ] Verify: dev server — leaderboard identical (spot-check rows/podium/filters/sort/search),
        charts page renders, no new console errors.
- [ ] **Commit 2 — feat: points-per-event column**
  - [ ] computeRankings: `ppe = points/participations` if participations ≥ minEventsForPpe else null.
  - [ ] App: `minEventsForPpe` state (default 15) → SettingsMenu + PlayerList.
  - [ ] SettingsMenu: "Points per Event" section, "Min events" number input.
  - [ ] PlayerList desktop: sortable "Pts/Event" column between Events and Points; dash for null;
        nulls always sort last; colSpan 10→11.
  - [ ] PlayerList mobile: "Sort by" select in bottom sheet (Points | Points per event); trailing
        value shows PPE when PPE-sorted; top-3 hidden from list only in default points order.
  - [ ] Verify: threshold edit live-updates column; sort asc/desc nulls last; mobile sheet sort.
- [ ] **Commit 3 — feat: formula memory (A-lite)**
  - [ ] `src/lib/formulaStorage.js` — versioned key `qpr.formula.v1`, load/save with try/catch.
  - [ ] App: lazy-init 8 config objects + minEventsForPpe from stored (per-object spread over
        defaults), save-on-change effect.
  - [ ] Verify: change settings → reload → settings retained; bad/missing stored JSON → defaults.
- [ ] **Commit 4 — docs**: CLAUDE.md (structure, state arch, known issues #1–#3 resolved, PPE,
      localStorage), roadmap.md feature-1 marked shipped + decision log, todo.md review section.
- [ ] Final: `npm run build` passes.

## Review

(filled at end of session)
