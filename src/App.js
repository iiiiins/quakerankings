import React, { useState, useEffect, useRef, useCallback } from "react";
import { HashRouter as Router, Routes, Route, useLocation, Link } from "react-router-dom";
import PlayerList from "./components/PlayerList";
import PlayerPage from "./components/PlayerPage";
import AdvancedStats from "./components/AdvancedStats";
import EventsBrowser from "./components/EventsBrowser";
import Methodology from "./components/Methodology";
import AdminPage from "./components/AdminPage";
import ReactGA from "react-ga4";
ReactGA.initialize(process.env.REACT_APP_GA_ID);

import {
  Box,
  Button,
  CssBaseline,
  Container,
  IconButton,
  ThemeProvider,
  Popover,
} from "@mui/material";
import SettingsIcon from "@mui/icons-material/Settings"; // Import Settings Icon
import ShareIcon from "@mui/icons-material/Share";
import SettingsMenu from "./components/SettingsMenu";
import ShareMenu from "./components/ShareMenu";
import SharedBanner from "./components/SharedBanner";
import CustomFormulaBanner from "./components/CustomFormulaBanner";
import { loadStoredFormula, saveStoredFormula } from "./lib/formulaStorage";
import { parseShareFromHash } from "./lib/shareCodec";
import {
  DEFAULT_POINTS_CONFIG,
  DEFAULT_POINTS_VISIBILITY,
  DEFAULT_GAME_WEIGHTS,
  DEFAULT_GAME_VISIBILITY,
  DEFAULT_TIER_WEIGHTS,
  DEFAULT_TIER_VISIBILITY,
  DEFAULT_MODE_WEIGHTS,
  DEFAULT_MODE_VISIBILITY,
  DEFAULT_MIN_EVENTS_FOR_PPE,
  DEFAULT_FILTERS,
} from "./lib/formulaDefaults";
import theme from "./theme";
import "./App.css";
import twitterLogo from "./logos/x_logo.png";
import twitchLogo from "./logos/tv_logo.png";
import AnalyticsTracker from "./AnalyticsTracker";

// Nav tabs live in their own component so useLocation runs inside <Router>
const NavTabs = () => {
  const { pathname } = useLocation();
  const tabs = [
    // Home stays highlighted on player detail pages, as before
    { label: "Home", hash: "#/", active: pathname === "/" || pathname.startsWith("/players") },
    { label: "Events", hash: "#/events", active: pathname === "/events" },
    { label: "Advanced Stats", hash: "#/charts", active: pathname === "/charts" },
  ];
  return (
    <nav className="site-tabs">
      {tabs.map((tab) => (
        <Button
          key={tab.label}
          variant={tab.active ? "contained" : "text"}
          color="primary"
          className={tab.active ? "" : "tab-idle"}
          onClick={() => (window.location.hash = tab.hash)}
        >
          {tab.label}
        </Button>
      ))}
    </nav>
  );
};

// The share affordance only exists on the home board — the link it builds
// always targets "/" with the current formula + home filters. Lives in its
// own component so useLocation runs inside <Router> (same as NavTabs).
const ShareControl = ({ config, getFilters }) => {
  const { pathname } = useLocation();
  const [anchorEl, setAnchorEl] = useState(null);
  if (pathname !== "/") return null;
  return (
    <>
      <IconButton
        color="inherit"
        onClick={(e) => setAnchorEl(e.currentTarget)}
        aria-label="Share this ranking"
      >
        <ShareIcon />
      </IconButton>
      <Popover
        id="share-popover"
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <ShareMenu config={config} filters={getFilters()} />
      </Popover>
    </>
  );
};

// The visitor's own formula: stored sections spread over defaults, so a
// formula saved before a new game/mode/setting was added still loads cleanly.
const ownFormula = (stored) => ({
  pointsConfig: { ...DEFAULT_POINTS_CONFIG, ...stored?.pointsConfig },
  pointsVisibility: { ...DEFAULT_POINTS_VISIBILITY, ...stored?.pointsVisibility },
  gameWeights: { ...DEFAULT_GAME_WEIGHTS, ...stored?.gameWeights },
  gameVisibility: { ...DEFAULT_GAME_VISIBILITY, ...stored?.gameVisibility },
  tierWeights: { ...DEFAULT_TIER_WEIGHTS, ...stored?.tierWeights },
  tierVisibility: { ...DEFAULT_TIER_VISIBILITY, ...stored?.tierVisibility },
  modeWeights: { ...DEFAULT_MODE_WEIGHTS, ...stored?.modeWeights },
  modeVisibility: { ...DEFAULT_MODE_VISIBILITY, ...stored?.modeVisibility },
  minEventsForPpe: stored?.minEventsForPpe ?? DEFAULT_MIN_EVENTS_FOR_PPE,
});

// Read once per page load. A share link in the URL (#/?f=v1...) wins over the
// stored formula: an omitted segment means DEFAULT, never the viewer's own
// value, so the same link shows the same board to everyone. The stored
// formula is left untouched until the visitor explicitly adopts.
const sharedBoot = parseShareFromHash(window.location.hash);
const initialFormula = sharedBoot ? sharedBoot.config : ownFormula(loadStoredFormula());

const App = () => {
  const [pointsConfig, setPointsConfig] = useState(initialFormula.pointsConfig);
  const [pointsVisibility, setPointsVisibility] = useState(initialFormula.pointsVisibility);
  const [gameWeights, setGameWeights] = useState(initialFormula.gameWeights);
  const [gameVisibility, setGameVisibility] = useState(initialFormula.gameVisibility);
  const [tierWeights, setTierWeights] = useState(initialFormula.tierWeights);
  const [tierVisibility, setTierVisibility] = useState(initialFormula.tierVisibility);
  const [modeVisibility, setModeVisibility] = useState(initialFormula.modeVisibility);
  const [modeWeights, setModeWeights] = useState(initialFormula.modeWeights);

  // Points/Event is only shown for players with at least this many events
  const [minEventsForPpe, setMinEventsForPpe] = useState(initialFormula.minEventsForPpe);

  // Shared-view mode: non-null while a share link's formula is active and
  // unadopted. Holds the decoded link itself ({ config, filters }) so the
  // banner can describe what was shared. boardKey remounts PlayerList when
  // the board must re-derive its filters (reset, or a new link arriving).
  const [shared, setShared] = useState(sharedBoot);
  const [boardKey, setBoardKey] = useState(0);

  // Formula memory: returning visitors keep their tuning. Suppressed while
  // viewing a shared ranking — merely opening a link must not overwrite the
  // visitor's own formula. Flipping shared to null re-runs this effect, so
  // adopting persists the current (shared) formula with no extra save call.
  useEffect(() => {
    if (shared) return;
    saveStoredFormula({
      pointsConfig,
      pointsVisibility,
      gameWeights,
      gameVisibility,
      tierWeights,
      tierVisibility,
      modeWeights,
      modeVisibility,
      minEventsForPpe,
    });
  }, [
    pointsConfig,
    pointsVisibility,
    gameWeights,
    gameVisibility,
    tierWeights,
    tierVisibility,
    modeWeights,
    modeVisibility,
    minEventsForPpe,
    shared,
  ]);

  // A share link can also arrive without a page load (pasting a second link
  // into the address bar only fires hashchange). Apply it like a boot.
  const applyShared = useCallback((next) => {
    setPointsConfig(next.config.pointsConfig);
    setPointsVisibility(next.config.pointsVisibility);
    setGameWeights(next.config.gameWeights);
    setGameVisibility(next.config.gameVisibility);
    setTierWeights(next.config.tierWeights);
    setTierVisibility(next.config.tierVisibility);
    setModeWeights(next.config.modeWeights);
    setModeVisibility(next.config.modeVisibility);
    setMinEventsForPpe(next.config.minEventsForPpe);
    setShared(next);
    setBoardKey((k) => k + 1);
  }, []);

  useEffect(() => {
    const onHashChange = () => {
      const next = parseShareFromHash(window.location.hash);
      if (next) applyShared(next);
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [applyShared]);

  // Drop the f param after adopt/reset so a reload doesn't re-enter shared
  // view. replaceState avoids a router navigation (we're on "/" already).
  const cleanShareUrl = () => {
    window.history.replaceState(
      null,
      "",
      window.location.pathname + window.location.search + "#/"
    );
  };

  // Keep this formula: the suppressed save effect fires once shared clears,
  // persisting exactly what's on screen. The board keeps its current state.
  const adoptShared = () => {
    setShared(null);
    cleanShareUrl();
  };

  // The custom-formula banner's reset: factory defaults, not the stored
  // formula — the save effect then persists them over the old tuning.
  // Filters/sort stay untouched (they're visible, page-owned view state).
  const resetFormulaToDefaults = () => {
    setPointsConfig({ ...DEFAULT_POINTS_CONFIG });
    setPointsVisibility({ ...DEFAULT_POINTS_VISIBILITY });
    setGameWeights({ ...DEFAULT_GAME_WEIGHTS });
    setGameVisibility({ ...DEFAULT_GAME_VISIBILITY });
    setTierWeights({ ...DEFAULT_TIER_WEIGHTS });
    setTierVisibility({ ...DEFAULT_TIER_VISIBILITY });
    setModeWeights({ ...DEFAULT_MODE_WEIGHTS });
    setModeVisibility({ ...DEFAULT_MODE_VISIBILITY });
    setMinEventsForPpe(DEFAULT_MIN_EVENTS_FOR_PPE);
  };

  // Reset to default: the default SITE, in one click — factory formula
  // (persisted by the save effect once shared clears) and a fresh board (the
  // remount drops the link's filters AND sort). Deliberately not "back to
  // your stored formula": a sharer's stored formula IS the shared one
  // (formula memory saved it as they tuned), so restoring it made reset look
  // like it only touched the sort. The button does what it says, including
  // for a visitor with their own tuning — viewing never destroys it, this
  // explicit click does.
  const resetShared = () => {
    resetFormulaToDefaults();
    setShared(null);
    setBoardKey((k) => k + 1);
    cleanShareUrl();
  };

  const [anchorEl, setAnchorEl] = useState(null);
  const handleSettingsClick = (event) => {
    setAnchorEl(event.currentTarget);
  };
  const handleSettingsClose = () => {
    setAnchorEl(null);
  };
  const isOpen = Boolean(anchorEl);

  // Mirror of PlayerList's filter state for the header share popover. A ref
  // is enough: the popover re-reads it when it opens, and the open popover
  // blocks filter interaction, so it can't go stale while visible.
  const homeFiltersRef = useRef({ ...DEFAULT_FILTERS });
  const handleFiltersChange = useCallback((filters) => {
    homeFiltersRef.current = filters;
  }, []);
  const getHomeFilters = useCallback(() => homeFiltersRef.current, []);

  const scoringConfig = {
    pointsConfig,
    pointsVisibility,
    gameWeights,
    gameVisibility,
    tierWeights,
    tierVisibility,
    modeWeights,
    modeVisibility,
    minEventsForPpe,
  };

  

  return (
    <ThemeProvider theme={theme}>

      <CssBaseline />
      <Router>
      <AnalyticsTracker />
        <Container maxWidth="lg">
          <header className="site-header">
            <h1 className="wordmark">
              <span className="q">Quake</span> Player Rankings
            </h1>
            <NavTabs />
            <Box className="header-icons">
              <ShareControl config={scoringConfig} getFilters={getHomeFilters} />
              <IconButton
                color="inherit"
                onClick={handleSettingsClick}
                aria-controls="settings-menu"
                aria-haspopup="true"
                aria-label="Settings"
              >
                <SettingsIcon />
              </IconButton>
              <Popover
                id="settings-popover"
                open={isOpen}
                anchorEl={anchorEl}
                onClose={handleSettingsClose}
                anchorOrigin={{
                  vertical: "bottom",
                  horizontal: "right",
                }}
                transformOrigin={{
                  vertical: "top",
                  horizontal: "right",
                }}
              >
                <SettingsMenu
                  pointsConfig={pointsConfig}
                  setPointsConfig={setPointsConfig}
                  pointsVisibility={pointsVisibility}
                  setPointsVisibility={setPointsVisibility}
                  gameWeights={gameWeights}
                  setGameWeights={setGameWeights}
                  gameVisibility={gameVisibility}
                  setGameVisibility={setGameVisibility}
                  tierWeights={tierWeights}
                  setTierWeights={setTierWeights}
                  tierVisibility={tierVisibility}
                  setTierVisibility={setTierVisibility}
                  modeVisibility={modeVisibility}
                  setModeVisibility={setModeVisibility}
                  modeWeights={modeWeights}
                  setModeWeights={setModeWeights}
                  minEventsForPpe={minEventsForPpe}
                  setMinEventsForPpe={setMinEventsForPpe}
                />
              </Popover>
            </Box>
          </header>
          {shared ? (
            <SharedBanner shared={shared} onAdopt={adoptShared} onReset={resetShared} />
          ) : (
            <CustomFormulaBanner config={scoringConfig} onReset={resetFormulaToDefaults} />
          )}
            <Routes>
              {/* Home Page */}
              <Route
                path="/"
                element={
                  <PlayerList
                    key={boardKey}
                    pointsConfig={pointsConfig}
                    pointsVisibility={pointsVisibility}
                    gameWeights={gameWeights}
                    gameVisibility={gameVisibility}
                    tierWeights={tierWeights}
                    tierVisibility={tierVisibility}
                    modeWeights={modeWeights}
                    modeVisibility={modeVisibility}
                    minEventsForPpe={minEventsForPpe}
                    onFiltersChange={handleFiltersChange}
                    initialFilters={shared?.filters}
                  />
                }
              />
              {/* Tournament Browser */}
              <Route path="/events" element={<EventsBrowser />} />
              {/* Methodology */}
              <Route path="/methodology" element={<Methodology />} />
              {/* Admin (no nav tab — direct URL; security lives in RLS) */}
              <Route path="/admin" element={<AdminPage />} />
              {/* Stats Page */}
              <Route
                path="/charts"
                element={
                  <AdvancedStats
                    pointsConfig={pointsConfig}
                    pointsVisibility={pointsVisibility}
                    gameWeights={gameWeights}
                    gameVisibility={gameVisibility}
                    tierWeights={tierWeights}
                    tierVisibility={tierVisibility}
                    modeWeights={modeWeights}
                    modeVisibility={modeVisibility}
                  />
                }
              />
              {/* Player Details Page */}
              <Route
                path="/players/:playerName"
                element={
                  <PlayerPage
                    pointsConfig={pointsConfig}
                    pointsVisibility={pointsVisibility}
                    gameWeights={gameWeights}
                    gameVisibility={gameVisibility}
                    tierWeights={tierWeights}
                    tierVisibility={tierVisibility}
                    modeWeights={modeWeights}
                    modeVisibility={modeVisibility}
                  />
                }
              />
            </Routes>
          <footer>
            <ul>
              <li>
                <a href="https://x.com/thisisins">
                  <img src={twitterLogo} alt="twitter" />
                </a>
              </li>
              <li>
                <a href="https://twitch.tv/theamazingins">
                  <img src={twitchLogo} alt="twitch" />
                </a>
              </li>
              <li>
                <span>discord @ theamazingins</span>
              </li>
              <li>
                <Link className="method-link" to="/methodology">
                  How the ranking works
                </Link>
              </li>
            </ul>
          </footer>
        </Container>
      </Router>
    </ThemeProvider>
  );
};

export default App;
