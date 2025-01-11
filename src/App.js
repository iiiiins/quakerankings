import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import PlayerList from "./components/PlayerList";
import PlayerPage from "./components/PlayerPage";
import {
  Box,
  Button,
  CssBaseline,
  Container,
  IconButton,
  TableContainer,
  ThemeProvider,
  createTheme,
  Paper,
  Popover,
  Typography,
} from "@mui/material";
import SettingsIcon from "@mui/icons-material/Settings"; // Import Settings Icon
import SettingsMenu from "./components/SettingsMenu";
import { fetchPlayers } from "./services/fetchPlayersByGame";
import "./App.css";
import twitterLogo from "./logos/x_logo.png";
import twitchLogo from "./logos/tv_logo.png";

// Create a dark theme for the app
const darkTheme = createTheme({
  palette: {
    mode: "dark",
  },
});

const App = () => {
  const [lanOnly, setLanOnly] = useState(false); // Default to false (no filtering)

  const [yearRange, setYearRange] = useState([1996, 2025]); // Default range

  const [selectedGame, setSelectedGame] = useState("All"); // Default to "All"

  const [selectedMode, setSelectedMode] = useState("All"); // Default to "All"

  const [pointsConfig, setPointsConfig] = useState({
    first: 100,
    second: 50,
    top4: 25,
    top8: 10,
  });

  const [pointsVisibility, setPointsVisibility] = useState({
    first: true,
    second: true,
    top4: true,
    top8: true,
  });

  const [gameWeights, setGameWeights] = useState({
    "Quake World": 100,
    "Quake 2": 100,
    "Quake 3": 100,
    "Quake 4": 100,
    "Quake Live": 100,
    "Quake Champions": 100,
    Diabotical: 100,
  });

  const [gameVisibility, setGameVisibility] = useState({
    "Quake World": true,
    "Quake 2": true,
    "Quake 3": true,
    "Quake 4": true,
    "Quake Live": true,
    "Quake Champions": true,
    Diabotical: true,
  });

  const [tierWeights, setTierWeights] = useState({
    1: 100,
    2: 60,
    3: 35,
    4: 20,
    5: 10,
  });

  const [tierVisibility, setTierVisibility] = useState({
    1: true,
    2: true,
    3: true,
    4: true,
    5: true,
  });
  //console.log("Points Config:", pointsConfig);
  //console.log("Points Visibility:", pointsVisibility);

  //console.log("Game Config:", gameWeights);
  //console.log("Game Visibility:", gameVisibility);

  //console.log("Tier Config:", tierWeights);
  //console.log("Tier Visibility:", tierVisibility);
  const [players, setPlayers] = useState([]);

  useEffect(() => {
    const fetchAndRecalculate = async () => {
      const updatedPlayers = await fetchPlayers(
        selectedGame,
        selectedMode,
        yearRange,
        lanOnly,
        pointsConfig,
        pointsVisibility,
        gameWeights,
        gameVisibility,
        tierWeights,
        tierVisibility
      );
      setPlayers(updatedPlayers);
    };

    fetchAndRecalculate();
  }, [
    selectedGame,
    selectedMode,
    yearRange,
    lanOnly,
    pointsConfig,
    pointsVisibility,
    gameWeights,
    gameVisibility,
    tierWeights,
    tierVisibility,
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
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Router>
        <Container>
          <TableContainer component={Paper}>
            <Typography className="title-top" variant="h4" align="center" gutterBottom>
              Quake Player Rankings
            </Typography>

            <Box
              display="flex"
              justifyContent="flex-end"
              alignItems="center"
              p={2}
              className="settings-menu"
            >
              <IconButton
                color="inherit"
                onClick={handleSettingsClick}
                aria-controls="settings-menu"
                aria-haspopup="true"
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
                className="custom-popover" // Custom class name
                PaperProps={{
                  className: "custom-paper", // Class for the paper element
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
                />
              </Popover>
            </Box>
            <Routes>
              {/* Home Page */}
              <Route
                path="/"
                element={
                  <PlayerList
                    players={players}
                    setPlayers={setPlayers}
                    selectedGame={selectedGame}
                    selectedMode={selectedMode}
                    yearRange={yearRange}
                    lanOnly={lanOnly}
                    pointsConfig={pointsConfig}
                    pointsVisibility={pointsVisibility}
                    gameWeights={gameWeights}
                    gameVisibility={gameVisibility}
                    tierWeights={tierWeights}
                    tierVisibility={tierVisibility}
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
                  />
                }
              />
            </Routes>
          </TableContainer>
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
            </ul>
          </footer>
        </Container>
      </Router>
    </ThemeProvider>
  );
};

export default App;
