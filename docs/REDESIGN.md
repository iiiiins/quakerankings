# Redesign brief

Written 2026-06-11 at the end of the session that planned the feature roadmap. This is the handoff
for the redesign session(s). Read `CLAUDE.md` (repo root) first for the codebase map — this file
only covers the redesign itself.

## Mission

Visual redesign of the whole site. Two phases, strictly in order:

1. **Direction mocks.** Produce 2–3 full-page design directions as standalone HTML files in
   `docs/mocks/` (one file per direction; the leaderboard page is the hero view — include the
   header, filter bar, and table with realistic density: 15+ rows, long player names, many game
   logos in one cell). Each direction gets a one-paragraph rationale. Bruno picks one (or a
   hybrid). **No application code is touched in this phase.**
2. **Implementation.** Apply the chosen direction. Iterate against the live dev server and
   compare screenshots to the chosen mock — the mock is the fixed target, agreed before any CSS
   is written. If the session runs long and output drifts from the target, stop and hand off to
   a fresh session with the mock + current screenshots rather than pushing on.

## Hard constraints

- **Theme overhaul, not a restructure.** Same components, same state, same logic. The vehicle is
  a real MUI `createTheme` (palette, typography, shape, component default-props/styleOverrides)
  replacing the current `App.css` free-for-all. `App.css` should shrink to font imports and a few
  true globals. Do not introduce another UI framework; stack stays MUI 6.3 + React 19 + CRA 5.
- **Responsive is in scope and required.** This redesign deliberately absorbs the "mobile pass"
  roadmap item. The leaderboard table, player pages, and charts must be usable on a phone.
  Direction mocks should show (or at least describe) the mobile treatment of the leaderboard.
- **Keep the identity:** dark theme; the medal column system (gold/silver/bronze/copper headers
  and tinted placement cells); Orbitron for player names; per-game logo PNGs in rows. Directions
  may evolve these (better shades, refined usage) but not abandon them.

## What's wrong today (the concrete pain)

- `App.css` imports 8 Google Font families; several elements fall back to serif stacks
  (Cambria/Georgia/Times) — visible in the settings popover and table headers.
- Default MUI control sizes mixed with hand-shrunk ones (0.6–0.7rem inputs in the popover).
- Fixed pixel layouts: `.chart-box` is 950px wide with `left: 15%`, container forced to 1500px,
  `width: 200%` on a table cell. Nothing reflows below desktop width.
- Two emotion-hash selectors (`.css-kmnzss`, `.css-zpntfe-MuiTableCell-root`) doing real layout
  work — these break on any MUI upgrade and must be replaced with theme overrides or classes.
- Inconsistent spacing/density; `!important` sprinkled throughout.

## Surfaces in scope

- `PlayerList` ("/") — header, nav buttons, filter bar (game, mode, year slider, search, LAN +
  Power Ranking checkboxes), summary line, the leaderboard table, scroll-to-load-more.
- `AdvancedStats` ("/charts") — same filter bar, chart.js line chart, player picker list.
- `PlayerPage` ("/players/:name") — stat header block, per-game tournament tables.
- `SettingsMenu` — the gear popover (4 sections of checkbox + weight input rows).
- Header/footer (title, nav, X/Twitch links).

Design the system so these **near-future surfaces** drop in without new invention (do not build
them now): share popover + "viewing a shared ranking" banner (feature A — see the mock below),
an admin data-entry page, and a public "submit a tournament" form (features B1/B2).

## References

- Live site: https://iiiiins.github.io/quakerankings/
- Fidelity bar + feature-A UI: `docs/mocks/shareable-rankings-walkthrough.html` — the mock that
  triggered this redesign. The goal is that the real site stops looking worse than its mockups.
- Dev server: `npm start` → http://localhost:3000/quakerankings/ (`.env.development.local` with
  `PUBLIC_URL=/quakerankings` must exist — see CLAUDE.md quirks). A Claude-preview launch config
  exists at `D:\ins\quakerankings\.claude\launch.json` ("dev" entry, autoPort).

## Done criteria

- Phase 1: 2–3 direction files exist in `docs/mocks/`, Bruno has picked one, and the choice +
  any hybrid notes are recorded at the bottom of this file.
- Phase 2: live site matches the chosen mock on desktop and phone widths; `App.css` reduced to
  fonts + true globals; zero emotion-hash selectors; CLAUDE.md design/quirk sections updated;
  deployed via `npm run deploy`.

## Decision log

- (append direction choice and deviations here)
