import React, { useState, useEffect } from "react";
import { HashRouter as Router, Routes, Route, useLocation, Link } from "react-router-dom";
import PlayerList from "./components/PlayerList";
import PlayerPage from "./components/PlayerPage";
import AdvancedStats from "./components/AdvancedStats";
import EventsBrowser from "./components/EventsBrowser";
import Methodology from "./components/Methodology";
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
import SettingsMenu from "./components/SettingsMenu";
import { loadStoredFormula, saveStoredFormula } from "./lib/formulaStorage";
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

// Read once per page load; each state below spreads the stored section over
// its defaults, so a formula saved before a new game/mode/setting was added
// still loads cleanly.
const storedFormula = loadStoredFormula();

const App = () => {
  const [pointsConfig, setPointsConfig] = useState({
    first: 100,
    second: 50,
    top4: 25,
    top8: 10,
    ...storedFormula?.pointsConfig,
  });

  const [pointsVisibility, setPointsVisibility] = useState({
    first: true,
    second: true,
    top4: true,
    top8: true,
    ...storedFormula?.pointsVisibility,
  });

  const [gameWeights, setGameWeights] = useState({
    "Quake World": 100,
    "Quake 2": 100,
    "Quake 3": 100,
    "Quake 4": 100,
    "Quake Live": 100,
    "Quake Champions": 100,
    Diabotical: 100,
    ...storedFormula?.gameWeights,
  });

  const [gameVisibility, setGameVisibility] = useState({
    "Quake World": true,
    "Quake 2": true,
    "Quake 3": true,
    "Quake 4": true,
    "Quake Live": true,
    "Quake Champions": true,
    Diabotical: true,
    ...storedFormula?.gameVisibility,
  });

  const [tierWeights, setTierWeights] = useState({
    1: 100,
    2: 60,
    3: 35,
    4: 20,
    5: 10,
    ...storedFormula?.tierWeights,
  });

  const [tierVisibility, setTierVisibility] = useState({
    1: true,
    2: true,
    3: true,
    4: true,
    5: true,
    ...storedFormula?.tierVisibility,
  });

  const [modeVisibility, setModeVisibility] = useState({
    "Duel": true,
    "2v2": true,
    "TDM": true,
    "CTF": true,
    "CA": true,
    "SAC": true,
    "WIP": true,
    "DBT": true,
    ...storedFormula?.modeVisibility,
  });

  const [modeWeights, setModeWeights] = useState({
    "Duel": 100,
    "2v2": 100,
    "TDM": 100,
    "CTF": 100,
    "CA": 100,
    "SAC": 100,
    "WIP": 100,
    "DBT": 100,
    ...storedFormula?.modeWeights,
  });

  // Points/Event is only shown for players with at least this many events
  const [minEventsForPpe, setMinEventsForPpe] = useState(
    storedFormula?.minEventsForPpe ?? 15
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
                  />
                }
              />
              {/* Tournament Browser */}
              <Route path="/events" element={<EventsBrowser />} />
              {/* Methodology */}
              <Route path="/methodology" element={<Methodology />} />
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
