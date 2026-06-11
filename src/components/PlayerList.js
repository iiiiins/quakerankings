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
import { fetchListTournaments } from "../services/fetchPlayersByGame";
import diaboticalLogo from "../logos/diabotical_logo.png";
import quakeWorldLogo from "../logos/quakeworld_logo.png";
import quake2Logo from "../logos/quake2_logo.png";
import quake3Logo from "../logos/quake3_logo.png";
import quake4Logo from "../logos/quake4_logo.png";
import quakeLiveLogo from "../logos/quakelive_logo.png";
import quakeChampionsLogo from "../logos/quakechampions_logo.png";

const CURRENT_YEAR = new Date().getFullYear();

const PlayerList = ({
  pointsConfig,
  pointsVisibility,
  gameWeights,
  gameVisibility,
  tierWeights,
  tierVisibility,
  modeWeights,
  modeVisibility,
}) => {
  const [totalTournaments, setTotalTournaments] = useState(0);
  const [visiblePlayers, setVisiblePlayers] = useState([]);
  const [loadMore, setLoadMore] = useState(100);
  const [filteredTournaments, setFilteredTournaments] = useState(0);
  const [players, setPlayers] = useState([]);
  const [filteredPlayers, setFilteredPlayers] = useState([]);
  const [tournamentList, setTournamentList] = useState([]);
  const [sortBy, setSortBy] = useState("Points");
  const [sortOrder, setSortOrder] = useState("desc");
  const [selectedGame, setSelectedGame] = useState("All");
  const [selectedMode, setSelectedMode] = useState("All");
  const [yearRange, setYearRange] = useState([1996, CURRENT_YEAR]);
  const [topTournamentsLimit, setTopTournamentsLimit] = useState(25);
  const [topTournamentsFilter, setTopTournamentsFilter] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [lanOnly, setLanOnly] = useState(false);
  const [powerRanking, setPowerRanking] = useState(false);
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
    modeWeights: { "Duel": 100, "2v2": 100, "TDM": 100, "CTF": 100, "CA": 100, "SAC": 100, "WIP": 100, "DBT": 100 },
    modeVisibility: { "Duel": true, "2v2": true, "TDM": true, "CTF": true, "CA": true, "SAC": true, "WIP": true, "DBT": true },
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

  //GET LIST OF TOURNAMENTS FROM SUPABASE AT PAGE LOAD
  useEffect(() => {
  const getFullList = async() => {
    const tournamentList = await fetchListTournaments();
    setTournamentList(tournamentList);
  }
  getFullList();
}, []);

useEffect(() => {
  const handleScroll = () => {
    const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
    if (scrollTop + clientHeight >= scrollHeight - 10) {
      setLoadMore((prev) => prev + 100); // Load 100 more players
    }
  };

  window.addEventListener("scroll", handleScroll);
  return () => window.removeEventListener("scroll", handleScroll);
}, []);

useEffect(() => {
  setVisiblePlayers(filteredPlayers.slice(0, loadMore));
}, [filteredPlayers, loadMore]);

  //CALCULATE PLAYERS AND FILTERED TOURNAMENTS AT EVERY CHANGE
  useEffect(() => {
    if(!tournamentList) return;
    
    const TOP_TOURNAMENTS_LIMIT = 25; // Default to 25 top tournaments
    const fetchAndCalculate = async () => {
      
      let filteredCount = 0;
      setLoadMore(100); // Reset load more count
      const playerStats = {};
      const tournamentsArray = Object.values(tournamentList)
      
      const totalTournaments = tournamentsArray.length;

      tournamentsArray.forEach((tournament) => {
        
        if (
          !tournament.Game ||
          !tournament.Mode ||
          !tournament.Tier ||
          !tournament.Year
        ) {
          console.error("Invalid tournament entry:", tournament);
          return;
        }
        // Filter by Game function
        if (selectedGame != tournament.Game && selectedGame != "All") {
          filteredCount++;
          return;
        }
    
        // Filter by Game function
        if (selectedMode != tournament.Mode && selectedMode != "All") {
          filteredCount++;
          return;
        }
        // Filter by game visibility, mode visibility, tier visibility, and LAN
        const isFiltered =
          !(gameVisibility[tournament.Game] ?? true) ||
          !(tierVisibility[tournament.Tier] ?? true) ||
          !(modeVisibility[tournament.Mode] ?? true) ||
          (lanOnly && !tournament.LAN) ||
          tournament.Year < yearRange[0] ||
          tournament.Year > yearRange[1];
    
        if (isFiltered) {
          filteredCount++;
          return; // Skip processing this tournament
        }
    
        const tierWeight = tierWeights[tournament.Tier] ?? 100;
        const gameWeight = gameWeights[tournament.Game] ?? 100;
        const modeWeight = modeWeights[tournament.Mode] ?? 100;
        
        const placements = {
          first: tournament["1st"],
          second: tournament["2nd"],
          top4: [tournament["3rd"], tournament["4th"]],
          top8: [
            tournament["5th"],
            tournament["6th"],
            tournament["7th"],
            tournament["8th"],
          ],
        };
        
        Object.entries(placements).forEach(([placementKey, players]) => {
          if (!pointsVisibility[placementKey]) return;
    
          const playersArray = Array.isArray(players) ? players : [players];
          playersArray.forEach((player) => {
            if (!player) return;
    
            if (!playerStats[player]) {
              playerStats[player] = {
                player,
                points: 0,
                placements: { first: 0, second: 0, top4: 0, top8: 0 },
                games: new Set(),
                modes: new Set(),
                participations: 0,
                tournaments: [],
              };
            }
    
            let points = 0;
            if (placementKey === "first") {
              points = pointsConfig.first * (tierWeight / 100) * (gameWeight / 100) * (modeWeight / 100);
            } else if (placementKey === "second") {
              points =
                pointsConfig.second * (tierWeight / 100) * (gameWeight / 100) * (modeWeight / 100);
            } else if (placementKey === "top4") {
              points = pointsConfig.top4 * (tierWeight / 100) * (gameWeight / 100) * (modeWeight / 100);
            } else if (placementKey === "top8") {
              points = pointsConfig.top8 * (tierWeight / 100) * (gameWeight / 100) * (modeWeight / 100);
            }
            playerStats[player].participations++;
            playerStats[player].points += points;
            playerStats[player].placements[placementKey]++;
            playerStats[player].games.add(tournament.Game);
            playerStats[player].modes.add(tournament.Mode);
            playerStats[player].tournaments.push({
              tournamentName: tournament.Event_Name,
              year: tournament.Year,
              game: tournament.Game,
              mode: tournament.Mode,
              tier: tournament.Tier,
              points,
              placement: placementKey,
            });
          });
        });
      });
      
      

      const players = Object.values(playerStats).map((player, index) => {
        
      
        // Default to empty arrays if `games` or `modes` is missing
        const games = Array.isArray(player.games)
          ? player.games
          : Array.from(player.games || []);
        const modes = Array.isArray(player.modes)
          ? player.modes
          : Array.from(player.modes || []);
      
        // Ensure `points` exists
        const points = Math.round(player.points || 0);
      
        return {
          ...player,
          points,
          games: games.join(", "),
          modes: modes.join(", "),
        };
      });
      
      // Debugging `players`
      //console.log("Processed Players:", players);
      
      if (players.length === 0) {
        console.error("No players found in playerStats.");
      }
      
      if (powerRanking) {
        players.forEach((player) => {
          // Sort tournaments by points
          player.tournaments.sort((a, b) => b.points - a.points);
  
          // Filter to top 25 tournaments
          const topTournaments = player.tournaments.slice(0, 25);
  
          // Recalculate stats based on top tournaments
          player.points = Math.round(topTournaments.reduce((sum, t) => sum + t.points, 0) || 0);
          player.placements = { first: 0, second: 0, top4: 0, top8: 0 };
          player.participations = topTournaments.length;
  
          topTournaments.forEach((t) => {
            if (t.placement === "first") player.placements.first++;
            if (t.placement === "second") player.placements.second++;
            if (t.placement === "top4") player.placements.top4++;
            if (t.placement === "top8") player.placements.top8++;
          });
        });
      }

      const sortedPlayers = [...players].sort((a, b) => b.points - a.points);
      sortedPlayers.forEach((player, index) => {
        player.Rank = index + 1; // Assign rank dynamically
      });

      setPlayers(sortedPlayers);
      setFilteredPlayers(sortedPlayers);
      setFilteredTournaments(filteredCount); // Update filtered tournaments state
      setTotalTournaments(totalTournaments); // Update total tournaments state
    };

    fetchAndCalculate();
  }, [
    tournamentList,
    selectedGame,
    selectedMode,
    yearRange,
    lanOnly,
    powerRanking,
    pointsConfig,
    pointsVisibility,
    gameWeights,
    gameVisibility,
    tierWeights,
    tierVisibility,
    modeWeights,
    modeVisibility,
  ]);
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
              max={CURRENT_YEAR}
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
          <FormControlLabel
            control={
              <Checkbox
                checked={powerRanking}
                onChange={(e) => setPowerRanking(e.target.checked)}
                color="primary"
                title="Show only the top 25 tournaments for each player"
              />
              
            }
            label="POWER RANKING"
            title="Show only the top 25 tournaments for each player"
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
              visiblePlayers.map((player) => (
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
