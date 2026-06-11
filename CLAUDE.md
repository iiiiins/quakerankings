# CLAUDE.md

Regenerated 2026-06-11 from a full source read. Every claim below was verified against the code on that date.

## Overview

Quake Player Rankings is a single-page React app that aggregates competitive Quake tournament results across the franchise (Quake World through Champions, plus Diabotical) into a weighted player ranking. Users tune the scoring formula in real time — placement-point values, per-game / per-tier / per-mode weights, and visibility toggles for each — and the leaderboard recomputes client-side against a Supabase-backed tournament dataset. Filters cover game, mode, year range, LAN-only, and a "Power Ranking" mode (top-25 tournaments per player). Players drill down to a per-player detail page; an Advanced Stats page renders points-over-time line charts.

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
│   ├── PlayerList.js              "/" route. Fetches all tournaments once, computes ranks client-side,
│   │                              renders top-3 podium + leaderboard with sort/filter/search, LAN-only +
│   │                              Power Ranking plates, scroll-to-bottom pager (+100 rows). Below 900px
│   │                              (useMediaQuery) it renders the mobile podium + chip rail + bottom-sheet
│   │                              Drawer + one-row player list instead of the table
│   ├── PlayerPage.js              "/players/:playerName". Per-player history; runs its own filtered
│   │                              supabase .or() query against the URL slug
│   ├── AdvancedStats.js           "/charts" route. Player picker + chart.js <Line> of points over time;
│   │                              ~200 lines copy-pasted from PlayerList (see Known issues)
│   └── SettingsMenu.js            controlled form in the gear popover; four sections (Points, Games,
│                                  Tier, Mode), each row = visibility checkbox + weight input
├── services/
│   ├── supabaseClient.js          hardcoded Supabase URL + anon JWT, exports the client
│   └── fetchPlayersByGame.js      exports fetchListTournaments (used) and fetchTotalTournaments (never
│                                  imported — dead). A large fetchPlayers() sits commented out in /* */
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
- **Power Ranking**: per player, keep only the top-25 tournaments by points and recompute points/placements/participations. The 25 is hardcoded at the `slice` call sites.
- PlayerPage computes the same formula written as `(base × tierW × gameW × modeW) / 1000000` — mathematically equivalent; don't "fix" one to match the other without reading both. It rounds to 1 decimal where the list pages round to integers.
- PlayerPage extras: average placement (1st=1, 2nd=2, Top4=3.5, Top8=6.5), grand finals = 1st+2nd count, grand-final win rate = 1sts / grand finals.

## State architecture

`App` owns the **scoring configuration** (8 objects: `pointsConfig`/`pointsVisibility`, `gameWeights`/`gameVisibility`, `tierWeights`/`tierVisibility`, `modeWeights`/`modeVisibility`) and passes values + setters to `<SettingsMenu>` (the only edit point) and values to all three pages, which genuinely consume them.

**Filter state is per-page, not shared.** App also declares `players`, `selectedGame`, `selectedMode`, `yearRange`, `lanOnly`, `powerRanking` and passes them as props — but the pages don't even destructure those props; each declares its own `useState` copies. The App-level copies (and its orphan `setPowerRanking`) are dead. Changing a filter on one page does not affect another.

Data flow per page:
- `PlayerList` and `AdvancedStats` each call `fetchListTournaments()` (full table) once on mount, then re-run the same in-memory scoring loop on every dependency change.
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

Remaining after the 2026-06-11 fix batch (year cap, weight-fallback mismatch, Diabotical dropdown gap, debug text/log spam, favicon/manifest, medal-header `class=`, Participations sort arrow — all fixed and deployed that day) and the 2026-06-11 redesign (which additionally removed the emotion-hash selectors, serif fallbacks, fixed pixel layouts, and PlayerPage's nested ThemeProvider, and made all three pages responsive).

1. **~200-line copy-paste between `PlayerList` and `AdvancedStats`**: the entire fetch + scoring loop + `handleSort` + `columnKeyMap`. In AdvancedStats the table-sort half of that copy (`handleSort`, `sortBy`, `sortOrder`, `columnKeyMap`) plus `loadMore`/`visiblePlayers` are vestigial — no table or scroll pager exists on the charts page.
2. **Dead state blocks**: both list pages carry an unused `settings` object (full defaults, `setSettings` never called) and unused `topTournamentsLimit`/`topTournamentsFilter` state shadowed by the hardcoded 25; `AdvancedStats` additionally has unused `playerIndex`, `players` (post-set), and `getRandomColor`. `App.js` imports `fetchPlayers` which resolves to `undefined` (the function is commented out in the service) and never calls it.
3. **AdvancedStats double-initializes the chart selection**: two effects both react to `filteredPlayers` and both call `setSelectedPlayers(...slice(0, 5))`; the processed one wins. Under Power Ranking it also truncates `player.tournaments` to the top 25, so charts only plot those.
4. **Config hardcoded**: Supabase anon JWT in `supabaseClient.js` and GA ID in `App.js` — move both to env vars. Write-safety was verified 2026-06-11: an anon insert probe returns 401, so the public key is read-only as intended.
5. **Cosmetics**: `package.json` `"name": "react"`; `public/index.html` `<title>` is "Quake Rankings" while the H1 reads "Quake Player Rankings". A no-players `console.error` still fires if user settings filter out every tournament (the on-load case was fixed).

## Local dev quirks

- `.npmrc` — `legacy-peer-deps=true`, required for React 19 against CRA 5's peer deps.
- `.env.development.local` (gitignored, create it yourself): `PUBLIC_URL=/quakerankings` so dev serves at the same path as GitHub Pages.
- Dev server emits two `Watchpack Error (initial scan): EINVAL` lines for `D:\Recovery` / `D:\System Volume Information` on Windows — Watchpack scans the drive root and chokes on system folders. Compile and HMR are unaffected.
- ~23 transitive-dep deprecation warnings during `npm install` — standard for `react-scripts` 5.
