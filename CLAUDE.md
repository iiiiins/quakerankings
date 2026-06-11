# CLAUDE.md

Regenerated 2026-06-11 from a full source read; updated the same day after the leaderboard-upgrades session (roadmap feature 1). Every claim below was verified against the code on that date.

## Overview

Quake Player Rankings is a single-page React app that aggregates competitive Quake tournament results across the franchise (Quake World through Champions, plus Diabotical) into a weighted player ranking. Users tune the scoring formula in real time — placement-point values, per-game / per-tier / per-mode weights, and visibility toggles for each — and the leaderboard recomputes client-side against a Supabase-backed tournament dataset; the formula persists across visits in localStorage. Filters cover game, mode, year range, LAN-only, and a "Power Ranking" mode (top-25 tournaments per player). Players drill down to a per-player detail page; an Advanced Stats page renders points-over-time line charts.

## Stack

- **React 19.0** + **react-scripts 5.0.1** (Create React App). React 19 with CRA 5 is unofficial — `.npmrc` has `legacy-peer-deps=true` so `npm install` resolves.
- **Routing**: `react-router-dom` 7.x using `HashRouter`. Deploy path is `https://iiiiins.github.io/quakerankings/#/...`. Three routes only.
- **UI**: `@mui/material` 6.3 + `@mui/icons-material` 6.3. Full custom theme in `src/theme.js` (2026-06-11 redesign: ember `#e05a1f` primary on warm gunmetal surfaces, Rajdhani UI type, component styleOverrides); design-system classes (medal headers/lanes, podium, plates, mobile rows) live in `App.css`. The fixed visual target is `docs/mocks/direction-hybrid.html` — compare against it before changing styles (full brief: `docs/REDESIGN.md`). Emotion is the MUI peer dep.
- **Backend**: Supabase (`@supabase/supabase-js` 2.47) — a single `Tournaments` table read with the anonymous role. URL + anon JWT are hardcoded in `src/services/supabaseClient.js`.
- **Charts**: `chart.js` 4.x + `react-chartjs-2` 5.x. Only `Line` is used; scales/elements registered at the top of `AdvancedStats.js`.
- **Analytics**: `react-ga4` with GA property `G-X11M9568HY`, initialized at module load in `App.js`; `AnalyticsTracker` fires a pageview on each route change.
- **Hosting**: GitHub Pages, served from the `gh-pages` branch. `main` holds source.

## Project structure

```
src/
├── index.js                       createRoot mount under <StrictMode>
├── App.js                         header (wordmark/NavTabs/gear), footer, settings popover, <Routes>; owns scoring config
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
│   └── SettingsMenu.js            controlled form in the gear popover; five sections (Points, Games,
│                                  Tier, Mode — rows = visibility checkbox + weight input — and
│                                  Points per Event with the min-events threshold)
├── hooks/
│   └── useTournaments.js          shared fetch hook; module-level cache = one table fetch per session
├── lib/
│   ├── computeRankings.js         the pure scoring/filter/rank pipeline both list pages consume
│   └── formulaStorage.js          load/save the scoring config, versioned key qpr.formula.v1
├── services/
│   ├── supabaseClient.js          hardcoded Supabase URL + anon JWT, exports the client
│   └── fetchPlayersByGame.js      fetchListTournaments — full Tournaments table, [] on error
└── logos/                         per-game PNGs + footer X/Twitch logos
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
| `1st` … `8th` | string \| null | one player name per slot |

Rows missing `Game`, `Mode`, `Tier`, or `Year` are skipped with a `console.error`. Placement buckets: 1st, 2nd, Top4 (= 3rd+4th), Top8 (= 5th–8th).

PlayerPage queries with `eq` on the **lowercased** URL slug (`1st.eq.<name>`); Postgres `eq` is case-sensitive, so this only matches if DB names are stored lowercase. Client-side comparisons lowercase both sides.

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

## State architecture

`App` owns the **scoring configuration** (8 objects: `pointsConfig`/`pointsVisibility`, `gameWeights`/`gameVisibility`, `tierWeights`/`tierVisibility`, `modeWeights`/`modeVisibility`, plus `minEventsForPpe`) and passes values + setters to `<SettingsMenu>` (the only edit point) and values to the pages that consume them. The whole set persists via `lib/formulaStorage.js` (**formula memory**): saved to localStorage on every change, loaded at page load with each stored section spread over its defaults (so formulas saved before a new game/mode/setting still load), versioned key `qpr.formula.v1` — bump it to invalidate stale shapes. Corrupt or unavailable storage falls back to defaults silently.

**Filter state is per-page, not shared.** Each list page declares its own `selectedGame`, `selectedMode`, `yearRange`, `lanOnly`, `powerRanking`; changing a filter on one page does not affect another.

Data flow per page:
- `PlayerList` and `AdvancedStats` read the table through `useTournaments()` (module-level cache — one Supabase fetch per session, shared across pages; empty/error results aren't cached so a later mount retries) and run `computeRankings(tournaments, config)` in a `useMemo`. PlayerList layers search + column sort on top as derived memos, so sort survives searches and settings changes; `Rank` is always the points-desc rank regardless of the displayed order.
- `PlayerPage` builds its own filtered Supabase query per visit.

Routes (all under `HashRouter`): `/` → PlayerList, `/charts` → AdvancedStats, `/players/:playerName` → PlayerPage. In-app nav in `App.js` uses `window.location.hash = "#/..."` rather than `useNavigate()` — works, but bypasses the router lifecycle.

## Build & deploy

- `npm start` — dev server at `http://localhost:3000/quakerankings/` (path prefix comes from `PUBLIC_URL` in `.env.development.local`).
- `npm run build` — CRA production build into `build/`; `homepage` in `package.json` roots assets under `/quakerankings/`.
- `npm run deploy` — `predeploy` builds, then `gh-pages -d build` pushes to the `gh-pages` branch. Pipeline restored and exercised 2026-06-11 (first deploy since Jan 25 2025), verified against the live site.
- Production URL: `https://iiiiins.github.io/quakerankings/`.

## Recovery story (why the history looks like this)

The working source was lost locally in 2025; deploys had been going straight to `gh-pages` without commits, so `main` was ~2 weeks stale. On 2026-05-10 the source was reconstructed from the deployed build's source maps (`static/js/main.*.js.map` on `gh-pages`) and committed to `main` in one commit (`2ce69d7`). The recovered code corresponds to the **Jan 25 2025 production deploy** and is faithful to it — bugs and dead code were deliberately preserved. Everything under Known issues below ships in production today.

## Known issues / tech debt

Remaining after the 2026-06-11 fix batch (year cap, weight-fallback mismatch, Diabotical dropdown gap, debug text/log spam, favicon/manifest, medal-header `class=`, Participations sort arrow — all fixed and deployed that day), the 2026-06-11 redesign (emotion-hash selectors, serif fallbacks, fixed pixel layouts, PlayerPage's nested ThemeProvider removed; all three pages responsive), and the 2026-06-11 foundation extraction (which resolved the former #1–#3: the ~200-line PlayerList/AdvancedStats copy-paste, the dead state blocks/imports, and the AdvancedStats chart double-init — all replaced by `useTournaments` + `computeRankings`).

1. **Config hardcoded**: Supabase anon JWT in `supabaseClient.js` and GA ID in `App.js` — move both to env vars. Write-safety was verified 2026-06-11: an anon insert probe returns 401, so the public key is read-only as intended.
2. **Cosmetics**: `package.json` `"name": "react"`; `public/index.html` `<title>` is "Quake Rankings" while the H1 reads "Quake Player Rankings". A no-players `console.error` still fires if user settings filter out every tournament (the on-load case stays silent).
3. **Narrow-desktop horizontal scroll**: with the Pts/Event column the table needs ~1060px; between 900px (the mobile breakpoint) and ~1110px viewports it scrolls horizontally inside the board (MUI `overflow-x: auto`) instead of fully fitting.

## Local dev quirks

- `.npmrc` — `legacy-peer-deps=true`, required for React 19 against CRA 5's peer deps.
- `.env.development.local` (gitignored, create it yourself): `PUBLIC_URL=/quakerankings` so dev serves at the same path as GitHub Pages.
- Dev server emits two `Watchpack Error (initial scan): EINVAL` lines for `D:\Recovery` / `D:\System Volume Information` on Windows — Watchpack scans the drive root and chokes on system folders. Compile and HMR are unaffected.
- ~23 transitive-dep deprecation warnings during `npm install` — standard for `react-scripts` 5.
