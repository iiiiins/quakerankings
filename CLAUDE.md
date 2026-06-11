# CLAUDE.md

Regenerated 2026-06-11 from a full source read. Every claim below was verified against the code on that date.

## Overview

Quake Player Rankings is a single-page React app that aggregates competitive Quake tournament results across the franchise (Quake World through Champions, plus Diabotical) into a weighted player ranking. Users tune the scoring formula in real time — placement-point values, per-game / per-tier / per-mode weights, and visibility toggles for each — and the leaderboard recomputes client-side against a Supabase-backed tournament dataset. Filters cover game, mode, year range, LAN-only, and a "Power Ranking" mode (top-25 tournaments per player). Players drill down to a per-player detail page; an Advanced Stats page renders points-over-time line charts.

## Stack

- **React 19.0** + **react-scripts 5.0.1** (Create React App). React 19 with CRA 5 is unofficial — `.npmrc` has `legacy-peer-deps=true` so `npm install` resolves.
- **Routing**: `react-router-dom` 7.x using `HashRouter`. Deploy path is `https://iiiiins.github.io/quakerankings/#/...`. Three routes only.
- **UI**: `@mui/material` 6.3 + `@mui/icons-material` 6.3, dark theme via `createTheme({ palette: { mode: "dark" } })`. Emotion is the MUI peer dep.
- **Backend**: Supabase (`@supabase/supabase-js` 2.47) — a single `Tournaments` table read with the anonymous role. URL + anon JWT are hardcoded in `src/services/supabaseClient.js`.
- **Charts**: `chart.js` 4.x + `react-chartjs-2` 5.x. Only `Line` is used; scales/elements registered at the top of `AdvancedStats.js`.
- **Analytics**: `react-ga4` with GA property `G-X11M9568HY`, initialized at module load in `App.js`; `AnalyticsTracker` fires a pageview on each route change.
- **Hosting**: GitHub Pages, served from the `gh-pages` branch. `main` holds source.

## Project structure

```
src/
├── index.js                       createRoot mount under <StrictMode>
├── App.js                         theme, header/footer, settings popover, <Routes>; owns scoring config
├── App.css                        global styles — 8 Google Fonts imports (Orbitron is the brand face)
├── AnalyticsTracker.js            GA pageview on each navigation (useLocation effect)
├── components/
│   ├── PlayerList.js              "/" route. Fetches all tournaments once, computes ranks client-side,
│   │                              renders leaderboard with sort/filter/search, LAN-only + Power Ranking
│   │                              toggles, scroll-to-bottom pager (+100 rows)
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
- `npm run deploy` — `predeploy` builds, then `gh-pages -d build` pushes to the `gh-pages` branch. `gh-pages@6.3` was installed 2026-06-11; the build step is verified, but no deploy has been run through it yet — the first real deploy is the remaining proof.
- Production URL: `https://iiiiins.github.io/quakerankings/`.

## Recovery story (why the history looks like this)

The working source was lost locally in 2025; deploys had been going straight to `gh-pages` without commits, so `main` was ~2 weeks stale. On 2026-05-10 the source was reconstructed from the deployed build's source maps (`static/js/main.*.js.map` on `gh-pages`) and committed to `main` in one commit (`2ce69d7`). The recovered code corresponds to the **Jan 25 2025 production deploy** and is faithful to it — bugs and dead code were deliberately preserved. Everything under Known issues below ships in production today.

## Known issues / tech debt

In rough priority order. All verified 2026-06-11.

1. **Year filter is hard-capped at 2025 — 2026 tournaments are invisible.** Default `yearRange` is `[1996, 2025]` and the sliders set `max={2025}` in `PlayerList.js`, `AdvancedStats.js`, and `PlayerPage.js` (plus dead copies in `App.js`). The scoring loops drop any row with `Year > yearRange[1]`, and PlayerPage's query uses `.lte("Year", ...)`. Any 2026 data imported into Supabase will not appear anywhere. First thing to fix before importing new results.
2. **Weight fallback differs across pages.** List pages use `?? 100` (a weight set to 0 stays 0); PlayerPage uses `|| 100` (a 0 weight silently becomes 100). PlayerPage also checks visibility without the `?? true` fallback the list pages use, so an unknown game/tier/mode key is included on lists but excluded on PlayerPage.
3. **~200-line copy-paste between `PlayerList` and `AdvancedStats`**: the entire fetch + scoring loop + `handleSort` + `columnKeyMap`. In AdvancedStats the table-sort half of that copy (`handleSort`, `sortBy`, `sortOrder`, `columnKeyMap`) plus `loadMore`/`visiblePlayers` are vestigial — no table or scroll pager exists on the charts page.
4. **Dead state blocks**: both list pages carry an unused `settings` object (full defaults, `setSettings` never called) and unused `topTournamentsLimit`/`topTournamentsFilter` state shadowed by the hardcoded 25; `AdvancedStats` additionally has unused `playerIndex`, `players` (post-set), and `getRandomColor`. `App.js` imports `fetchPlayers` which resolves to `undefined` (the function is commented out in the service) and never calls it.
5. **PlayerPage's Game dropdown is missing Diabotical** — list pages include it; Diabotical tournaments can't be isolated on a player page.
6. **AdvancedStats double-initializes the chart selection**: two effects both react to `filteredPlayers` and both call `setSelectedPlayers(...slice(0, 5))`; the processed one wins. Under Power Ranking it also truncates `player.tournaments` to the top 25, so charts only plot those.
7. **Visible debug text in production**: the charts-page summary line literally renders "CHARTS PAGE Showing N players…". Live `console.log`s fire in `AdvancedStats` (supabase payload, chart updates) and on every `PlayerPage` load (placement sums, per-tournament points). Most other logging is commented out.
8. **Small render bugs**: the four medal header cells in `PlayerList` use `class=` instead of `className=` (works in DOM, React warns); the Participations sort label checks `sortBy === "Participations"` but sorts `"participations"`, so its active arrow never lights.
9. **PlayerPage wraps its own `ThemeProvider` + `CssBaseline`** inside App's — redundant nesting.
10. **Secrets/config hardcoded**: Supabase anon JWT in `supabaseClient.js` (anon-key-in-client is the intended Supabase pattern, but it means access control rides entirely on RLS — confirm RLS is enabled on `Tournaments`); GA ID in `App.js`. Move both to env vars.
11. **Cosmetics**: `package.json` `"name": "react"`; `public/index.html` `<title>` is "Quake Rankings" while the H1 reads "Quake Player Rankings".

## Local dev quirks

- `.npmrc` — `legacy-peer-deps=true`, required for React 19 against CRA 5's peer deps.
- `.env.development.local` (gitignored, create it yourself): `PUBLIC_URL=/quakerankings` so dev serves at the same path as GitHub Pages.
- `public/` contains only `index.html`, but it references `%PUBLIC_URL%/manifest.json` and `favicon.ico` — browser logs a 404 for each plus a `Manifest: Syntax error` (it parses the SPA fallback HTML as JSON). Harmless.
- `App.css` targets two emotion-generated class names (`.css-kmnzss`, `.css-zpntfe-MuiTableCell-root`). These hashes are not stable across MUI/emotion upgrades — expect those two rules to silently stop applying after dependency bumps.
- Dev server emits two `Watchpack Error (initial scan): EINVAL` lines for `D:\Recovery` / `D:\System Volume Information` on Windows — Watchpack scans the drive root and chokes on system folders. Compile and HMR are unaffected.
- ~23 transitive-dep deprecation warnings during `npm install` — standard for `react-scripts` 5.
