# Feature 6 — Records page (player-depth opener)

Session 2026-06-12. Spec: docs/ROADMAP.md §6 (locked). Build + verify against dev
preview; NO deploy without Bruno's "ship it".

## Locked by roadmap

- `/records`: most titles (overall + per game), tier-1 title counts, grand-final
  conversion (min-N guard), longest career span, most events attended, biggest
  prize-pool events won (prize stays display-only — never a formula input).
- The twist: records **recompute under the visitor's formula** — gear settings and
  visibility toggles apply (a hidden game's titles don't count while hidden).
- Engines: useTournaments + computeRankings (+ groupEvents for prize records). No new
  data work. computeRankings' per-player output (visibility already applied) is the
  records input, not raw rows.
- Config flow: scoring config from App as props (PlayerList is the model). Home-board
  FILTERS stay per-page — records take the gear config only, no game/mode/year/LAN
  filters and **no Power Ranking** (that's a home filter).
- No share-contract changes; don't touch shareCodec/formulaDefaults.
- Design fixed: theme.js + App.css design-system classes; 900px breakpoint; player
  names lowercase; record rows link to /players/:name.

## Decided with Bruno (AskUserQuestion)

- **Nav = 4th header tab "Records" + scrollable mobile tab rail**: below 900px the
  .site-tabs row gets overflow-x auto with hidden scrollbar (chip-rail pattern), so
  feature 8's Compare tab fits later without wrapping. Features 7–9 follow this.

## Build decisions (this session, within the locked constraints)

- **Neutral filters into computeRankings**: selectedGame/Mode "All", yearRange
  [YEAR_MIN, CURRENT_YEAR], lanOnly false, powerRanking false + the 9 gear props.
- **Pure lib `src/lib/computeRecords.js`** consumed by the page in one useMemo;
  jest suite pins the business rules (min-N guard, visibility, tie-breaks).
- **Seven cards, top-5 lists** (titles-by-game = one leader row per visible game):
  1. Most titles — placements.first
  2. Titles by game — per visible game, leader(s) by first-place count (co-leaders listed, capped)
  3. Tier-1 titles — tournaments with placement first AND tier 1
  4. GF conversion — firsts/(firsts+seconds), **min 10 grand finals**; card empties
     if either the 1st or 2nd bucket is hidden (stat needs both)
  5. Longest career span — inclusive years (last − first + 1), "1997 → 2013"
  6. Most events attended — participations
  7. Biggest prize-pool events won — groupEvents filtered by game/tier/mode
     visibility, prizepool non-null, top 5 by prize; winners link to player pages
- **Tie-breaks**: value desc → points desc → name asc (GF: rate → GF count → name;
  span: years → participations → name). Points = the formula's own currency.
- Prize format: `$N.toLocaleString` (same as EventsBrowser's formatPrize).
- Page has NO filter bar / chip rail / bottom sheet — gear is the only input, by
  design. Lede explains the twist ("records follow your formula").

## Steps

- [ ] 1. `lib/computeRecords.js` + `computeRecords.test.js` → verify: suite green,
      full `npm test` green (shareCodec 22 untouched). Commit.
- [ ] 2. `components/RecordsPage.js` + App.js route/tab/props + App.css records
      classes + mobile tab rail → verify: dev preview desktop (numbers spot-checked
      vs /events data, gear toggles recompute live) + 380px mobile (cards stack,
      tab rail scrolls, no overflow). Commit.
- [ ] 3. CLAUDE.md + docs/ROADMAP.md updates (records shipped section + nav decision
      for features 7–9). Commit.

## Review

(to fill at session end)
