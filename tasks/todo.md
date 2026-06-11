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

- [ ] **Commit 1 — feat: tournament browser at /events**
  - [ ] `src/lib/groupEvents.js` — pure rows→events grouping per the merge rules above.
  - [ ] `src/lib/gameLogos.js` — extracted map; PlayerList switches to importing it.
  - [ ] `src/components/EventsBrowser.js` — filters/search/sort/scroll-pager (PlayerList
        patterns), desktop table + mobile rows/sheet.
  - [ ] `App.js` — `/events` route + Events tab (NavTabs → path-driven, 3 tabs; Home stays
        active-looking on player pages as today).
  - [ ] `App.css` — events-browser section (ev-name/ev-podium/prize-cell/lan-tag/mobile rows).
  - [ ] Verify in dev preview: 1,385 events & summary line; QuakeCon 2008 CTF (6 rows) merged
        with full roster podium; QuakeCon 2008 Duel separate; filters (game/tier/year/LAN) +
        search; sort year/tier/prize incl. prize-blanks-last; podium links → player pages;
        prize dashes visible; mobile 375px rail/sheet/rows; console clean.
- [ ] **Commit 2 — feat: methodology page**
  - [ ] `src/components/Methodology.js` — cards: the idea / formula + defaults / tiers (prize
        pool, era, competitiveness — and why prize pool is NOT a formula input) / placement
        buckets + team modes / filters & extras (LAN, Power Ranking, PPE≥15) / the data + 
        corrections CTA (discord).
  - [ ] `App.js` — `/methodology` route + footer link; `App.css` — method-* classes.
  - [ ] Verify: renders at /methodology, footer link works from all pages, /events link inside
        works, live count shows, mobile readable, console clean.
- [ ] **Commit 3 — docs**: CLAUDE.md (routes, structure, data-model Prizepool column, grouping
      semantics), roadmap §2 → SHIPPED + decision log, review section here.
- [ ] Final: `npm run build` passes. No deploy — Bruno tries it first ("ship it" gate).

## Review

(to fill at session end)
