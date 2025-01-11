import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Table,
  Container,
  TableContainer,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  Typography,
  TableSortLabel,
  FormControl,
  InputLabel,
  Select,
  TextField,
  MenuItem,
  Box,
  Slider,
  FormControlLabel,
  Checkbox,
} from "@mui/material";
import {
  fetchPlayers,
  fetchTotalTournaments,
} from "../services/fetchPlayersByGame";
import diaboticalLogo from "../logos/diabotical_logo.png";
import quakeWorldLogo from "../logos/quakeworld_logo.png";
import quake2Logo from "../logos/quake2_logo.png";
import quake3Logo from "../logos/quake3_logo.png";
import quake4Logo from "../logos/quake4_logo.png";
import quakeLiveLogo from "../logos/quakelive_logo.png";
import quakeChampionsLogo from "../logos/quakechampions_logo.png";

const PlayerList = ({
  pointsConfig,
  pointsVisibility,
  gameWeights,
  gameVisibility,
  tierWeights,
  tierVisibility,
  //pointsVisibility = { first: true, second: true, top4: false, top8: true },
  //gameWeights = {},
  //gameVisibility = {},
  //tierWeights = {},
  //tierVisibility = {}
}) => {
  const [totalTournaments, setTotalTournaments] = useState(0);
  const [filteredTournaments, setFilteredTournaments] = useState(0);
  const [players, setPlayers] = useState([]);
  const [filteredPlayers, setFilteredPlayers] = useState([]);
  const [sortBy, setSortBy] = useState("Points");
  const [sortOrder, setSortOrder] = useState("desc");
  const [selectedGame, setSelectedGame] = useState("All");
  const [selectedMode, setSelectedMode] = useState("All");
  const [yearRange, setYearRange] = useState([1996, 2024]);
  const [searchQuery, setSearchQuery] = useState("");
  const [lanOnly, setLanOnly] = useState(false);
  const [settings, setSettings] = useState({
    pointsConfig: { first: 100, second: 50, top4: 25, top8: 10 },
    pointsVisibility: { first: true, second: true, top4: false, top8: true },
    gameWeights: {
      "Quake World": 100,
      "Quake 2": 100,
      "Quake 3": 100,
      "Quake 4": 100,
      "Quake Live": 100,
      "Quake Champions": 100,
      Diabotical: 100,
    },
    gameVisibility: {
      "Quake World": true,
      "Quake 2": true,
      "Quake 3": true,
      "Quake 4": true,
      "Quake Live": true,
      "Quake Champions": true,
      Diabotical: true,
    },
    tierWeights: { 1: 100, 2: 60, 3: 35, 4: 20, 5: 10 },
    tierVisibility: { 1: true, 2: true, 3: true, 4: true, 5: true },
  });

  const games = [
    "All",
    "Quake World",
    "Quake 2",
    "Quake 3",
    "Quake 4",
    "Quake Live",
    "Quake Champions",
    "Diabotical",
  ];

  const modes = ["All", "Duel", "2v2", "TDM", "CTF", "CA", "SAC", "WIP", "DBT"];

  const gameLogos = {
    Diabotical: diaboticalLogo,
    "Quake World": quakeWorldLogo,
    "Quake 2": quake2Logo,
    "Quake 3": quake3Logo,
    "Quake 4": quake4Logo,
    "Quake Live": quakeLiveLogo,
    "Quake Champions": quakeChampionsLogo,
  };

  const columnKeyMap = {
    "1st": "placements.first",
    "2nd": "placements.second",
    Top4: "placements.top4",
    Top8: "placements.top8",
    Points: "points",
    Player: "player",
    Rank: "Rank",
  };

  useEffect(() => {
    const fetchAndCalculate = async () => {
      const allTournaments = await fetchTotalTournaments(); // Fetch all tournaments from the database
      /*const playerData = await fetchPlayers(
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
      );*/
      const { players, filteredCount, totalTournaments } = await fetchPlayers(
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

      // Default sorting by points in descending order
      const sortedPlayers = [...players].sort((a, b) => b.points - a.points);
      sortedPlayers.forEach((player, index) => {
        player.Rank = index + 1; // Assign rank dynamically
      });

      // Debugging logs
      //console.log("fetchandcalculate called");
      //console.log("Selected Game:", selectedGame);
      //console.log("Selected Mode:", selectedMode);
      //console.log("Year Range:", yearRange);
      //console.log("LAN Only:", lanOnly);
      //console.log("Points Config:", pointsConfig);
      //console.log("Points Visibility:", pointsVisibility);
      //console.log("Game Weights:", gameWeights);
      //console.log("Game Visibility:", gameVisibility);
      //console.log("Tier Weights:", tierWeights);
      //console.log("Tier Visibility:", tierVisibility);

      setPlayers(sortedPlayers);
      setFilteredPlayers(sortedPlayers);
      setFilteredTournaments(filteredCount); // Update filtered tournaments state
      setTotalTournaments(totalTournaments); // Update total tournaments state
    };

    fetchAndCalculate();
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
  //console.log("Points Config:", pointsConfig);
  //console.log("Points Visibility:", pointsVisibility);
  //console.log("Games Config:", gameWeights);
  //console.log("Games Visibility:", gameVisibility);
  //console.log("Tier Config:", tierWeights);
  //console.log("Tier Visibility:", tierVisibility);
  const handleSort = (column) => {
    const isAsc = sortBy === column && sortOrder === "asc";
    const newOrder = isAsc ? "desc" : "asc";
    setSortBy(column);
    setSortOrder(newOrder);

    const key = columnKeyMap[column] || column;

    const sortedPlayers = [...filteredPlayers].sort((a, b) => {
      let valA, valB;

      // Handle special cases for "Games Played" and "Modes Played" columns
      if (column === "games") {
        valA = a.games ? a.games.split(", ").length : 0;
        valB = b.games ? b.games.split(", ").length : 0;
      } else if (column === "modes") {
        valA = a.modes ? a.modes.split(", ").length : 0;
        valB = b.modes ? b.modes.split(", ").length : 0;
      } else {
        // Fallback for other columns
        valA = key.split(".").reduce((obj, keyPart) => obj?.[keyPart] || 0, a);
        valB = key.split(".").reduce((obj, keyPart) => obj?.[keyPart] || 0, b);
      }

      // Handle sorting for "player" (string column)
      if (column === "player") {
        return newOrder === "asc"
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      }

      // Handle numeric sorting for other columns
      return newOrder === "asc" ? valA - valB : valB - valA;
    });

    setFilteredPlayers(sortedPlayers);
  };

  const handleYearRangeChange = (event, newValue) => {
    setYearRange(newValue);
  };

  const handleSearch = (event) => {
    const query = event.target.value.toLowerCase();
    setSearchQuery(query);

    const searchedPlayers = players.filter((player) =>
      player.player.toLowerCase().includes(query)
    );

    setFilteredPlayers(searchedPlayers);
  };

  return (
    <Container>
      <TableContainer component={Paper}>
        <Typography variant="h4" align="center" gutterBottom></Typography>
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          padding="16px"
        >
          <FormControl style={{ minWidth: "200px" }}>
            <InputLabel>Filter by Game</InputLabel>
            <Select
              value={selectedGame}
              onChange={(e) => setSelectedGame(e.target.value)}
            >
              {games.map((game) => (
                <MenuItem key={game} value={game}>
                  {game}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl style={{ minWidth: "200px" }}>
            <InputLabel>Filter by Mode</InputLabel>
            <Select
              value={selectedMode}
              onChange={(e) => setSelectedMode(e.target.value)}
            >
              {modes.map((mode) => (
                <MenuItem key={mode} value={mode}>
                  {mode}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box width="300px" className="year-range">
            <Typography gutterBottom>Filter by Year</Typography>
            <Slider
              value={yearRange}
              onChange={handleYearRangeChange}
              valueLabelDisplay="auto"
              min={1996}
              max={2025}
              step={1}
            />
          </Box>

          <Box padding="16px" display="flex" justifyContent="center">
            <TextField
              label="Search Player"
              variant="outlined"
              value={searchQuery}
              onChange={handleSearch}
              style={{ width: "300px" }}
            />
          </Box>

          <FormControlLabel
            control={
              <Checkbox
                checked={lanOnly}
                onChange={(e) => setLanOnly(e.target.checked)}
                color="primary"
              />
            }
            label="LAN Only"
          />
        </Box>

        {/* Summary Message */}
        <Typography variant="subtitle1" align="left" gutterBottom>
          Showing {filteredPlayers.length} players in{" "}
          {totalTournaments - filteredTournaments} tournaments (
          {filteredTournaments} tournaments filtered out of {totalTournaments})
        </Typography>

        <Table>
          <TableHead className="table-header">
            <TableRow>
              <TableCell>
                <TableSortLabel
                  active={sortBy === "Rank"}
                  direction={sortBy === "Rank" ? sortOrder : "asc"}
                  onClick={() => handleSort("Rank")}
                >
                  Rank
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortBy === "player"}
                  direction={sortBy === "player" ? sortOrder : "asc"}
                  onClick={() => handleSort("player")}
                >
                  Player
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortBy === "games"}
                  direction={sortBy === "games" ? sortOrder : "asc"}
                  onClick={() => handleSort("games")}
                >
                  Games Played
                </TableSortLabel>
              </TableCell>
              <TableCell className="modes-header">
                <TableSortLabel
                  active={sortBy === "modes"}
                  direction={sortBy === "modes" ? sortOrder : "asc"}
                  onClick={() => handleSort("modes")}
                >
                  Modes Played
                </TableSortLabel>
              </TableCell>
              <TableCell class="gold-header" align="right">
                <TableSortLabel
                  active={sortBy === "1st"}
                  direction={sortBy === "1st" ? sortOrder : "asc"}
                  onClick={() => handleSort("1st")}
                >
                  1st
                </TableSortLabel>
              </TableCell>
              <TableCell class="silver-header" align="right">
                <TableSortLabel
                  active={sortBy === "2nd"}
                  direction={sortBy === "2nd" ? sortOrder : "asc"}
                  onClick={() => handleSort("2nd")}
                >
                  2nd
                </TableSortLabel>
              </TableCell>
              <TableCell class="bronze-header" align="right">
                <TableSortLabel
                  active={sortBy === "Top4"}
                  direction={sortBy === "Top4" ? sortOrder : "asc"}
                  onClick={() => handleSort("Top4")}
                >
                  Top4
                </TableSortLabel>
              </TableCell>
              <TableCell class="copper-header" align="right">
                <TableSortLabel
                  active={sortBy === "Top8"}
                  direction={sortBy === "Top8" ? sortOrder : "asc"}
                  onClick={() => handleSort("Top8")}
                >
                  Top8
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">
                <TableSortLabel
                  active={sortBy === "Participations"}
                  direction={sortBy === "Participations" ? sortOrder : "asc"}
                  onClick={() => handleSort("participations")}
                >
                  Participations
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">
                <TableSortLabel
                  active={sortBy === "Points"}
                  direction={sortOrder}
                  onClick={() => handleSort("Points")}
                >
                  Points
                </TableSortLabel>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredPlayers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  No results found
                </TableCell>
              </TableRow>
            ) : (
              filteredPlayers.map((player) => (
                <TableRow key={player.player}>
                  <TableCell>{player.Rank}</TableCell>
                  <TableCell className="players-list">
                    <Link to={`/players/${player.player}`}>
                      {player.player}
                    </Link>
                  </TableCell>
                  <TableCell className="games-list" align="right">
                    {player.games.split(", ").map((game) =>
                      gameLogos[game] ? (
                        <img
                          key={game}
                          src={gameLogos[game]}
                          alt={game}
                          title={game}
                          style={{
                            width: "30px",
                            height: "30px",
                            marginRight: "5px",
                          }}
                        />
                      ) : null
                    )}
                  </TableCell>
                  <TableCell className="modes-list" align="right">{player.modes || "N/A"}</TableCell>
                  <TableCell
                    className="numbers-list gold-placement"
                    align="right"
                  >
                    {player.placements?.first || 0}
                  </TableCell>
                  <TableCell
                    className="numbers-list silver-placement"
                    align="right"
                  >
                    {player.placements?.second || 0}
                  </TableCell>
                  <TableCell
                    className="numbers-list bronze-placement"
                    align="right"
                  >
                    {player.placements?.top4 || 0}
                  </TableCell>
                  <TableCell
                    className="numbers-list copper-placement"
                    align="right"
                  >
                    {player.placements?.top8 || 0}
                  </TableCell>
                  <TableCell className="numbers-list" align="right">
                    {player.participations || 0}
                  </TableCell>
                  <TableCell className="numbers-list" align="right">
                    {player.points || 0}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Container>
  );
};

export default PlayerList;
