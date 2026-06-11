# Feature 2 — Tournament browser + methodology rider (roadmap.md §2)

Session 2026-06-11. One committed feature: `/events` browser + `/methodology` page, staged as
verifiable commits. (Feature 1's plan/review: git `650f4fa`…`b4704ef`.)

## Decisions (made this session, from a live data probe)

- **Group key is `Event_Name|Year|Game|Mode`**, not the roadmap's literal `Event_Name+Year`.
  Probe (1,925 rows, anon query): 18 name+year groups span multiple *modes* (QuakeCon 2008 Duel
  vs CTF are different competitions) and 3 span multiple *games* — pure name+year would merge
  distinct podiums. The wider key still fully handles the roadmap's team-mode fact: 243
  multi-row groups merge (115× 2v2, 49× TDM, rest CTF/WIP/SAC/DBT/CA/Duel), → **1,385 events**.
- Merge rules for multi-row events (rows ordered by id for stability): placement buckets union
  non-null names, deduped — 1st, 2nd, Top4 (=3rd+4th), Top8 (=5th–8th); tier = min (2 groups
  vary), prizepool = max non-null (3 vary), LAN = OR (never varies).
- Browser is **scoring-config independent** — raw data, no props from App's formula state.
- Filters per roadmap: game / tier / year / LAN, plus event-name search. No mode filter
  (one-line add later if wanted); mode stays visible as a column.
- Desktop columns: Year · Event (+LAN tag) · Game · Mode · Tier · Prize · 1st · 2nd · Top 4 —
  medal headers/lanes reused from the leaderboard. Top8 omitted for width (visible on player
  pages). Sortable: Year (default desc), Event, Tier, Prize (blanks last both directions, same
  rule as PPE). Prize blanks → muted dash (94% coverage, 1,801/1,925 rows confirmed).
- Mobile (<900px): chip rail + bottom sheet (search/game/tier/years/LAN), two-line event rows
  (logo · name + year·mode·tier·prize sub-line · winner links right).
- Methodology: static content page in design-system cards; live event/tournament count via
  `useTournaments`; linked from the **footer** ("How the ranking works") — rider page, not a
  4th tab. Events gets the 3rd header tab (Home · Events · Advanced Stats).
- Tiny extraction riding along: `gameLogos` map → `src/lib/gameLogos.js` (PlayerList imports it;
  EventsBrowser needs the same map).

## Plan

- [x] **Commit 1 — feat: tournament browser at /events** (`9aaac5d`)
  - [x] `src/lib/groupEvents.js` — pure rows→events grouping per the merge rules above.
  - [x] `src/lib/gameLogos.js` — extracted map; PlayerList switches to importing it.
  - [x] `src/components/EventsBrowser.js` — filters/search/sort/scroll-pager (PlayerList
        patterns), desktop table + mobile rows/sheet.
  - [x] `App.js` — `/events` route + Events tab (NavTabs → path-driven, 3 tabs; Home stays
        active-looking on player pages as today).
  - [x] `App.css` — events-browser section (ev-name/ev-podium/prize-cell/lan-tag/mobile rows).
  - [x] Verified in dev preview: 1,385 events & summary; QuakeCon 2008 CTF (6 rows) merged
        with full roster podium while QuakeCon 2008 Duel stayed separate; game (QW→47) /
        tier (QW+T1→2) / year (≤2005→127, all sums = 1,385) / LAN (293) filters; search;
        sort year/tier/prize incl. blanks-last both directions; podium link → player page
        end-to-end (cypher); prize dashes; mobile 375px rail/sheet/rows no overflow; console
        clean; leaderboard regression (1,690/1,925 unchanged after gameLogos extraction).
- [x] **Commit 2 — feat: methodology page** (`f3da4ca`)
  - [x] `src/components/Methodology.js` — cards: formula + defaults / tiers (prize pool, era,
        competitiveness — and why prize pool is NOT a formula input) / placement buckets +
        team modes / filters & extras (LAN, Power Ranking, PPE≥15) / the data + corrections
        CTA (discord).
  - [x] `App.js` — `/methodology` route + footer link; `App.css` — method-* classes.
  - [x] Verified: renders, footer link navigates from home, /events links work, live counts
        (1,925 / 1,385) show, mobile + desktop screenshots clean, console clean.
- [x] **Commit 3 — docs**: CLAUDE.md (overview, routes, structure, data-model Prizepool +
      grouping note, state arch, known issue #3 extended), roadmap §2 → SHIPPED + decision
      log, this review.
- [x] Final: `npm run build` passes (+3.45 kB JS / +463 B CSS gzipped). No deploy — Bruno
      tries it first ("ship it" gate).

## Review

Built roadmap feature 2 in three commits: tournament browser (`9aaac5d`), methodology page
(`f3da4ca`), docs (`6fe777a`). Every step verified against the live dev preview; production
build green. Deployed 2026-06-11 after Bruno's "ship it": pre-deploy checks passed, main
pushed, `npm run deploy` published bundle `4a86168d`, live site verified (bundle hash flipped,
9/9 feature tokens present in live JS + CSS).

Decisions that diverge from the roadmap's literal text, all data-driven and documented:
- Group key includes Game+Mode (probe: name+year alone would merge QuakeCon divisions into one
  podium soup). 1,925 rows → 1,385 events; all 243 team multi-row groups merge correctly.
- No mode filter (roadmap listed game/tier/year/LAN); mode is a visible column, filter is a
  one-line add if wanted.
- Top8 names left off the table for width — they remain visible on player pages.
- Methodology is a footer link, not a 4th tab (rider-page prominence).

Two real bugs caught by preview verification, both table-layout:
- Auto-layout sized columns to max-content → 1,804px table; fixed with inner max-width divs on
  the name/podium cells (250px/178px).
- Adjacent nowrap links with no whitespace formed one unbreakable inline run → 8-name rosters
  overflowed invisibly (42px row, content bleeding); fixed with a trailing space inside the
  separator span (soft-wrap point). Lesson: inline wrapping needs whitespace break points.
