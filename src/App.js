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
import { loadStoredFormula, saveStoredFormula } from "./lib/formulaStorage";
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

// Read once per page load; each state below spreads the stored section over
// its defaults, so a formula saved before a new game/mode/setting was added
// still loads cleanly.
const storedFormula = loadStoredFormula();

const App = () => {
  const [pointsConfig, setPointsConfig] = useState({
    ...DEFAULT_POINTS_CONFIG,
    ...storedFormula?.pointsConfig,
  });

  const [pointsVisibility, setPointsVisibility] = useState({
    ...DEFAULT_POINTS_VISIBILITY,
    ...storedFormula?.pointsVisibility,
  });

  const [gameWeights, setGameWeights] = useState({
    ...DEFAULT_GAME_WEIGHTS,
    ...storedFormula?.gameWeights,
  });

  const [gameVisibility, setGameVisibility] = useState({
    ...DEFAULT_GAME_VISIBILITY,
    ...storedFormula?.gameVisibility,
  });

  const [tierWeights, setTierWeights] = useState({
    ...DEFAULT_TIER_WEIGHTS,
    ...storedFormula?.tierWeights,
  });

  const [tierVisibility, setTierVisibility] = useState({
    ...DEFAULT_TIER_VISIBILITY,
    ...storedFormula?.tierVisibility,
  });

  const [modeVisibility, setModeVisibility] = useState({
    ...DEFAULT_MODE_VISIBILITY,
    ...storedFormula?.modeVisibility,
  });

  const [modeWeights, setModeWeights] = useState({
    ...DEFAULT_MODE_WEIGHTS,
    ...storedFormula?.modeWeights,
  });

  // Points/Event is only shown for players with at least this many events
  const [minEventsForPpe, setMinEventsForPpe] = useState(
    storedFormula?.minEventsForPpe ?? DEFAULT_MIN_EVENTS_FOR_PPE
  );

  // Formula memory: returning visitors keep their tuning
  useEffect(() => {
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
  ]);

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
            <Routes>
              {/* Home Page */}
              <Route
                path="/"
                element={
                  <PlayerList
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
