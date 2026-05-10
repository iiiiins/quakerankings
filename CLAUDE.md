# CLAUDE.md

## Overview

Quake Player Rankings is a single-page React app that aggregates competitive Quake tournament results across the franchise (Quake World through Champions, plus Diabotical) into a weighted player ranking. Users tune the scoring formula in real time — placement-point values (1st / 2nd / Top4 / Top8), per-game weights, per-tier weights, per-mode weights, and visibility toggles for each — and the leaderboard recomputes against a Supabase-backed tournament dataset. Filters cover game, mode, year range (1996–2025), LAN-only, and an alternative "Power Ranking" scoring mode. Players drill down to a per-player detail page, and an Advanced Stats page renders points-over-time line charts.

## Stack

- **React 19.0** + **react-scripts 5.0.1** (Create React App). React 19 with CRA 5 is unofficial — `.npmrc` has `legacy-peer-deps=true` so `npm install` resolves.
- **Routing**: `react-router-dom` 7.x using `HashRouter`. Deploy path is `https://iiiiins.github.io/quakerankings/#/...`. Three routes only.
- **UI**: `@mui/material` 6.3 + `@mui/icons-material` 6.3, dark theme via `createTheme({ palette: { mode: "dark" } })`. Emotion (`@emotion/react`, `@emotion/styled`) is the MUI peer dep.
- **Backend**: Supabase (`@supabase/supabase-js` 2.47) — a single `Tournaments` table read with the anonymous role. URL + anon JWT are hardcoded in `src/services/supabaseClient.js`.
- **Charts**: `chart.js` 4.x + `react-chartjs-2` 5.x. Only the `Line` chart is used; required scales/elements are registered once at the top of `AdvancedStats.js`.
- **Analytics**: `react-ga4` 2.x with GA property `G-X11M9568HY`. Initialized once in `App.js`; `AnalyticsTracker` fires a pageview on each route change.
- **Hosting**: GitHub Pages, served from the `gh-pages` branch. The `main` branch holds source.

## Project structure

```
src/
├── index.js                       createRoot mount under <StrictMode>
├── App.js                         state shell, theme, header/footer, settings popover, <Routes>
├── App.css                        global styles — imports 8 Google Fonts (Orbitron is the brand face)
├── AnalyticsTracker.js            uses useLocation; sends a GA pageview on each navigation
├── components/
│   ├── PlayerList.js              "/" route. Fetches tournaments, computes ranks, renders leaderboard
│   │                              with sort/filter/search controls, LAN-only + Power Ranking toggles,
│   │                              and a scroll-to-load-more pager (+100 rows on scroll bottom)
│   ├── PlayerPage.js              "/players/:playerName". Per-player tournament history; runs its own
│   │                              filtered supabase.from("Tournaments").or(...) query against the URL slug
│   ├── AdvancedStats.js           "/charts" route. Player picker plus a chart.js <Line> chart of points
│   │                              over time; large overlap with PlayerList's calc logic
│   └── SettingsMenu.js            pure controlled form inside the gear-icon popover; four sections —
│                                  Points, Games, Tier, Mode — each with visibility checkbox + weight input
├── services/
│   ├── supabaseClient.js          hardcoded Supabase URL + anon JWT, exports the createClient instance
│   └── fetchPlayersByGame.js      exports fetchListTournaments + fetchTotalTournaments. A large
│                                  fetchPlayers(...) function is also present but wrapped in /* */ —
│                                  the score calc was moved into the page components
└── logos/
    ├── x_logo.png, tv_logo.png                                       footer (X, Twitch)
    └── diabotical_logo.png, quake2_logo.png, quake3_logo.png,
        quake4_logo.png, quakechampions_logo.png,
        quakelive_logo.png, quakeworld_logo.png                       per-game logos in rows + charts
```

## State architecture

`App` is the theme provider and route host. It owns the **scoring configuration** state — `pointsConfig` / `pointsVisibility`, `gameWeights` / `gameVisibility`, `tierWeights` / `tierVisibility`, `modeWeights` / `modeVisibility` — and passes both values and setters into `<SettingsMenu>`, which is the single edit point for the gear-icon popover. These eight settings objects are also passed as props to the three route components and **are** consumed there.

**Filter state is duplicated, not shared.** App also declares `players`, `selectedGame`, `selectedMode`, `yearRange`, `lanOnly`, `powerRanking` and passes them as props — but `PlayerList`, `PlayerPage`, and `AdvancedStats` each declare their own `useState` for the same names and never read the props. The App-level copies of these are effectively dead state. Filters live with the page that owns them; the props chain looks plumbed but isn't.

Each page fetches its own data:
- `PlayerList` and `AdvancedStats` call `fetchListTournaments()` once on mount, then run roughly the same per-tournament scoring math internally on every settings change (≈140 lines duplicated in each file).
- `PlayerPage` builds a `supabase.from("Tournaments").or(...)` query inline against the URL `playerName`.

Routes (all under `HashRouter`):

| Path | Component | Purpose |
|---|---|---|
| `/` | `PlayerList` | Leaderboard, default landing |
| `/charts` | `AdvancedStats` | Points-over-time line charts |
| `/players/:playerName` | `PlayerPage` | One player's tournament history |

Note: in-app navigation in `App.js` uses `window.location.hash = "#/charts"` (lines 153, 161) rather than `useNavigate()`. Works with HashRouter but bypasses the router's transition lifecycle.

## Build & deploy

- `npm start` — CRA dev server at `http://localhost:3000/quakerankings/`. The `/quakerankings/` prefix comes from `PUBLIC_URL` in `.env.development.local` so dev mirrors the GitHub Pages path.
- `npm run build` — CRA production build into `build/`. The `homepage` field in `package.json` puts assets under `/quakerankings/`.
- `npm run deploy` — runs `predeploy` (`npm run build`) then `gh-pages -d build`. **The `gh-pages` package is referenced by the script but not installed.** Deploy currently fails; restoring deploy hygiene is a separate phase.
- GitHub Pages serves the `gh-pages` branch at the project root. Production URL: `https://iiiiins.github.io/quakerankings/`.

## Recovery story

This source was recovered on 2026-05-10 from the deployed build's source maps. Background: deploys had been happening directly from a local working tree without committing to `main`, so the GitHub `main` branch drifted ~2 weeks behind production. After the local working directory was accidentally deleted, the only complete copy of the working source lived in the `gh-pages` branch's `static/js/main.*.js.map`. Source was extracted from those maps, then dropped onto a fresh `main` clone in a single recovery commit. The recovered build is the Jan 25 2025 deploy.

Two files were absent from `main` and restored from the source maps:

- `src/AnalyticsTracker.js` — GA pageview tracking
- `src/components/AdvancedStats.js` — the `/charts` page

The other source files were updated against `main` (PlayerList +277 lines, App +124, PlayerPage +109, SettingsMenu +57). Three runtime deps were added to `package.json`: `chart.js`, `react-chartjs-2`, `react-ga4`. Two cruft files were removed: a `gitignore` (no dot — a stray CRA template git wasn't using) and an empty `nodes` file.

Recovery is faithful: bugs and dead code present in production were preserved. Cleanup is intentionally a separate phase.

## Known issues / tech debt

Carried over from the recovered source unchanged.

- **`fetchPlayers` dead import.** `App.js` line 24 imports `fetchPlayers` from `./services/fetchPlayersByGame`, but the function body in that file is wrapped in `/* */`, so the import resolves to `undefined`. Nothing in `App.js` actually calls it. Safe to delete on both sides.
- **App-level filter state is dead.** App owns `players`, `lanOnly`, `powerRanking`, `selectedGame`, `selectedMode`, `yearRange` and passes them as props, but `PlayerList` / `AdvancedStats` declare their own `useState` for the same names and shadow the props. Either drop the App copies or lift filter state up properly so it's actually shared.
- **Score-calculation duplication.** `PlayerList` and `AdvancedStats` each re-implement the per-tournament scoring + power-ranking math (~140 nearly identical lines). Extract to a shared helper, or finish the commented-out `fetchPlayers` in the service module.
- **Orphan `setPowerRanking` in `App.js`** (line 40). Declared, never called. The visible Power Ranking checkbox is inside `PlayerList` and uses its own setter.
- **`predeploy`/`deploy` scripts reference `gh-pages` which isn't installed.** `npm run deploy` will fail. Add `gh-pages` as a devDependency before next deploy.
- **Commented-out `console.log` clutter** in most components. A few live `console.log`s remain in `AdvancedStats.js` (lines 314, 465). The `fetchPlayersByGame.js` logs (lines 104–106) sit inside the commented-out function and are dormant.
- **Hash-string navigation** in `App.js` (lines 153, 161) — `window.location.hash = "#/route"` instead of `useNavigate()`.
- **Supabase anon JWT committed in source.** Intended pattern for client-side Supabase (the anon role is meant to be public), but it means all access control rides on row-level security on the `Tournaments` table. Confirm RLS is enabled.
- **GA ID hardcoded** in `App.js` line 7. A commented copy lives in `AnalyticsTracker.js` line 5. Move to env var.
- **`package.json` `"name": "react"`.** Placeholder, harmless for local dev but should be `quakerankings`.
- **`public/index.html` `<title>` is "Quake Rankings"** while the visible H1 reads "Quake Player Rankings" (`App.js` line 147). Decide which is canonical.

## Local dev quirks

- `.npmrc` — `legacy-peer-deps=true`. Required so `npm install` resolves with React 19 against CRA 5 (which still pins React ≤18 in peer deps).
- `.env.development.local` (gitignored, you create it yourself) — `PUBLIC_URL=/quakerankings`. Matches the production GitHub Pages path so dev links work without rewrites. Without it, dev would serve at `/` and prod at `/quakerankings/`, and the hard-coded asset paths in `public/index.html` would diverge.
- `public/index.html` references `%PUBLIC_URL%/manifest.json` and `%PUBLIC_URL%/favicon.ico`, but neither file exists in `public/`. Browser logs a 404 for each and a `Manifest: Syntax error` (it fetches the SPA's 404 HTML body and tries to parse it as JSON). Both are harmless; restoring the assets is followup work.
- Dev server emits two `Watchpack Error (initial scan): EINVAL ... 'D:\Recovery'` / `'D:\System Volume Information'` lines on Windows. Watchpack scans the drive root on startup and chokes on system-reserved folders. Compile still succeeds; HMR works.
- 23 transitive-dep deprecation warnings during `npm install` (rimraf, glob, eslint 8, q, abab, etc.). All standard for `react-scripts` 5; not addressed during recovery.
