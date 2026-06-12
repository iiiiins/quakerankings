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

- [x] 1. `lib/computeRecords.js` + `computeRecords.test.js` → verified: 12 cases green,
      full `npm test` 34/34 (shareCodec 22 untouched). Commit `6ea064e`.
- [x] 2. `components/RecordsPage.js` + App.js route/tab/props + App.css records
      classes + mobile tab rail → verified on dev preview (see Review). Commit `c352b76`.
- [x] 3. CLAUDE.md + docs/ROADMAP.md updates (BUILT status + nav decision for
      features 7–9). Commit (docs).

## Review

Built and verified 2026-06-12. **NOT deployed** — Bruno tries it first, deploy on "ship it".

What was verified (dev preview, `.claude/launch.json` dev config):
- Desktop 1280: all seven cards render real data in the design language; spot checks
  matched known history (cypher 117 titles / 314 events, rapha 23 tier-1 majors of 89
  titles, clawz winning QWC 2017 Duel $340k, QWC 2017 SAC $660k with team winners + "+1"
  cap, hell 2000→2024 = 25 yrs inclusive). Records tab active state ✓.
- The twist, live: hiding Quake 3 via the gear dropped its titles-by-game row AND
  cypher's titles went 117 → 110 (events 314 → 300); restore brought 117 back. Hiding
  the 2nd bucket flipped GF conversion to the "needs both 1st and 2nd visible" note;
  restore brought fearz 15/16 = 93.8% back. localStorage residue cleared after.
- Mobile 375: 1-col cards, tab rail overflow-x auto (4 tabs fit; will scroll when
  feature 8 adds Compare), document width 375 = no horizontal overflow, prize winner
  lines wrap between names. Console: zero errors/warnings across the session.
- `npm test` 34/34 (computeRecords 12 + shareCodec 22) and `npm run build` both green.

Bugs found-and-fixed during verification (both in the new code):
1. `.rec-main` missing `flex: 1` — titles-by-game / prize values floated mid-card
   instead of the right edge.
2. Mobile min-content blowout (doc 401px @ 375 viewport): winner links rendered with NO
   whitespace between them (one unbreakable 212px run) and grid items default to
   min-width auto, so one card widened the whole track. Fixed at the source — literal
   spaces around separators are the wrap points — plus `min-width: 0` on grid items as
   the structural guard.

Decisions Bruno may want to revisit when trying it: MIN_GRAND_FINALS = 10 (the min-N
guard value), top-5 list length, career span counted inclusively (2000→2024 = 25 yrs),
and the GF-needs-both-buckets line. All are one-line changes in lib/computeRecords.js.
