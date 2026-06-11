import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Table,
  Button,
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
  List,
  ListItem,
  ListItemText,
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
import { Line } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend } from "chart.js";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);




const CURRENT_YEAR = new Date().getFullYear();

const AdvancedStats = ({
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
  const [processedPlayers, setProcessedPlayers] = useState([]);
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
  const [searchResults, setSearchResults] = useState([]);
  const [lanOnly, setLanOnly] = useState(false);
  const [powerRanking, setPowerRanking] = useState(false);
  const [selectedPlayers, setSelectedPlayers] = useState([]);
  const [playerIndex, setPlayerIndex] = useState(0);
  const [chartTitle, setChartTitle] = useState("Overall Max Points Over Time");
  const [selectedToggle, setSelectedToggle] = useState("overall"); // 'performance' or 'overall'
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




const getPlayerColor = (playerName) => {
  const colors = [
    "#FF5733", "#33FF57", "#3357FF", "#F3FF33", "#FF33A1",
    "#33FFF1", "#FFA833", "#8333FF", "#33FF83", "#FF3381",
  ];
  const hash = Array.from(playerName).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
};

// Helper to generate random colors
const getRandomColor = () =>
  `rgba(${Math.floor(Math.random() * 255)}, ${Math.floor(
    Math.random() * 255
  )}, ${Math.floor(Math.random() * 255)}, 1)`;

  // Update top players when filteredPlayers changes
  useEffect(() => {
    if (filteredPlayers.length > 0) {
      setSelectedPlayers(filteredPlayers.slice(0, 5)); // Default to the top 5 players
    }
  }, [filteredPlayers]);
  
  // Pre-process players to calculate points by year
  useEffect(() => {
    const calculatePointsByYear = (player) => {
      const pointsByYear = {};
      player.tournaments.forEach((tournament) => {
        const year = tournament.year;
        pointsByYear[year] = (pointsByYear[year] || 0) + tournament.points;
      });
      return { ...player, pointsByYear };
    };

    // Process all players and update state
    const processed = filteredPlayers.map(calculatePointsByYear);
    setProcessedPlayers(processed);

     // Set the initial top players (first 5)
     setSelectedPlayers(processed.slice(0, 5));
    }, [filteredPlayers]);

  // Generate labels (years)
  const labels = Array.from(
    new Set(
      processedPlayers.flatMap((player) => Object.keys(player.pointsByYear || {}))
    )
  ).sort();


  // Generate datasets
  const datasets = selectedPlayers.map((player, index) => ({
    label: player.player,
    data: labels.map((year) => player.pointsByYear?.[year] || 0), // Points for each year
    borderColor: getPlayerColor(player.player), // Consistent color
    backgroundColor: "rgba(0, 0, 0, 0)",
    fill: false,
    tension: 0.3, // Smooth curves
  }));

  // Chart data
  const [chartData, setChartData] = useState({
    labels: [],
    datasets: [],
  });


   // Chart options
   const chartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: { display: true, labels: { color: "#ece8df" } },
      tooltip: { mode: "index", intersect: false },
    },
    scales: {
      x: {
        title: { display: true, text: "Years", color: "#a39c8d" },
        ticks: { color: "#a39c8d" },
        grid: { color: "rgba(255,255,255,0.06)" },
      },
      y: {
        title: { display: true, text: "Points", color: "#a39c8d" },
        beginAtZero: true,
        ticks: { color: "#a39c8d" },
        grid: { color: "rgba(255,255,255,0.06)" },
      },
    },
  };

  // Selecting players
  const handleCheckboxChange = (player) => {
    if (!player.pointsByYear) {
      const pointsByYear = {};
      player.tournaments.forEach((tournament) => {
        const year = tournament.year; // Ensure the key is lowercase "year"
        pointsByYear[year] = (pointsByYear[year] || 0) + tournament.points;
      });
      player.pointsByYear = pointsByYear;
    }
  
    setSelectedPlayers((prev) =>
      prev.some((p) => p.player === player.player)
        ? prev.filter((p) => p.player !== player.player) // Remove player
        : [...prev, player] // Add player
    );
  };

  //Toggle Mode
  const toggleMode = () => {
    setSelectedToggle((prev) => {
      const newMode = prev === "overall" ? "performance" : "overall";
      setChartTitle(
        newMode === "overall"
          ? "Overall Max Points Over Time"
          : "Player Performance Per Year"
      );
      updateChartData(newMode); // Ensure the chart updates
      return newMode;
    });
  };

  // Calculate overall max points
  const calculateOverallMaxPoints = (tournaments) => {
    const pointsByYear = {};
    let cumulativePoints = 0;
  
    tournaments
      .sort((a, b) => a.year - b.year) // Ensure tournaments are sorted by year
      .forEach((tournament) => {
        cumulativePoints += tournament.points;
        pointsByYear[tournament.year] = cumulativePoints;
      });
  
    return pointsByYear;
  };

  //Update Chart Data based on Toggle
  const updateChartData = (toggle) => {
    const datasets = selectedPlayers.map((player) => {
      const pointsByYear =
        toggle === "performance"
          ? player.pointsByYear // Points gained per year
          : calculateOverallMaxPoints(player.tournaments); // Cumulative points
  
      // Ensure color assignment
      const color = getPlayerColor(player.player);
  
      return {
        label: player.player,
        data: Object.entries(pointsByYear).map(([year, points]) => ({
          x: year,
          y: points,
        })),
        borderColor: color,
        backgroundColor: color,
        fill: false,
      };
    });
  
    const labels = [...new Set(datasets.flatMap((ds) => ds.data.map((d) => d.x)))].sort();
  
    setChartData({
      labels,
      datasets,
    });
  };

  useEffect(() => {
    updateChartData(selectedToggle);
  }, [selectedToggle, selectedPlayers]);


  //CALCULATE PLAYERS AND FILTERED TOURNAMENTS AT EVERY CHANGE
  useEffect(() => {
    if(!tournamentList || tournamentList.length === 0) return;
    
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
          player.tournaments = player.tournaments.slice(0, 25);
  
          // Recalculate stats based on top tournaments
          player.points = Math.round(player.tournaments.reduce((sum, t) => sum + t.points, 0) || 0);
          player.placements = { first: 0, second: 0, top4: 0, top8: 0 };
          player.participations = player.tournaments.length;
  
          player.tournaments.forEach((t) => {
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

  const handleSearch = (query) => {
    setSearchQuery(query);
    if (query.trim() === "") {
      setSearchResults([]);
      return;
    }

    const results = filteredPlayers
      .filter((player) =>
        player.player.toLowerCase().includes(query.toLowerCase())
      )
      .slice(0, 10); // Show top 10 matches
    setSearchResults(results);
  };

  const handleAddPlayer = (player) => {
    setSearchQuery(""); // Clear search
    setSearchResults([]); // Clear results

    if (!player.pointsByYear) {
      const pointsByYear = {};
      player.tournaments.forEach((tournament) => {
        const year = tournament.year;
        pointsByYear[year] = (pointsByYear[year] || 0) + tournament.points;
      });
      player.pointsByYear = pointsByYear;
    }

    setSelectedPlayers((prev) =>
      prev.some((p) => p.player === player.player)
        ? prev // Player already exists; do nothing
        : [...prev, player] // Add player
    );
  };

  return (
    <Container disableGutters maxWidth={false}>
      <div className="filter-bar">
        <div className="filter-field">
          <span className="filter-label">Game</span>
          <FormControl size="small" style={{ minWidth: "150px" }}>
            <Select
              value={selectedGame}
              onChange={(e) => setSelectedGame(e.target.value)}
              renderValue={(v) => (v === "All" ? "All games" : v)}
            >
              {games.map((game) => (
                <MenuItem key={game} value={game}>
                  {game}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </div>

        <div className="filter-field">
          <span className="filter-label">Mode</span>
          <FormControl size="small" style={{ minWidth: "110px" }}>
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
        </div>

        <div className="filter-field years-field">
          <span className="filter-label">Years</span>
          <div className="yearline">
            <Slider
              value={yearRange}
              onChange={handleYearRangeChange}
              valueLabelDisplay="auto"
              min={1996}
              max={CURRENT_YEAR}
              step={1}
            />
            <span className="yearval">
              {yearRange[0]}–{yearRange[1]}
            </span>
          </div>
        </div>

        <div className="filter-field search-field" style={{ position: "relative" }}>
          <span className="filter-label">Add player to chart</span>
          <TextField
            size="small"
            placeholder="Search players…"
            variant="outlined"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            fullWidth
          />
          {searchResults.length > 0 && (
            <div className="search-results">
              {searchResults.map((player) => (
                <div
                  key={player.player}
                  className="search-result"
                  onClick={() => handleAddPlayer(player)}
                >
                  {player.player} · {player.points.toLocaleString("en-US")} pts
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="toggle-plates">
          <button
            type="button"
            className={`plate${lanOnly ? " on" : ""}`}
            onClick={() => setLanOnly(!lanOnly)}
            title="Only LAN tournaments"
          >
            <span className="led" />
            LAN Only
          </button>
          <button
            type="button"
            className={`plate${powerRanking ? " on" : ""}`}
            onClick={() => setPowerRanking(!powerRanking)}
            title="Show only the top 25 tournaments for each player"
          >
            <span className="led" />
            Power Ranking
          </button>
        </div>
      </div>

      {/* Summary Message */}
      <Typography component="div" className="summary-line">
        <b>{filteredPlayers.length.toLocaleString("en-US")}</b> players ·{" "}
        <b>{(totalTournaments - filteredTournaments).toLocaleString("en-US")}</b>{" "}
        tournaments · {filteredTournaments.toLocaleString("en-US")} filtered
      </Typography>

      <div className="chart-panel">
        <div className="chart-head">
          <Typography component="h2" className="chart-title">
            {chartTitle}
          </Typography>
          <Button variant="outlined" size="small" onClick={toggleMode}>
            {selectedToggle === "performance"
              ? "Switch to Overall Max Points"
              : "Switch to Performance Per Year"}
          </Button>
        </div>

        {/* Line Chart */}
        <Box className="chart-box">
          {selectedPlayers.length > 0 ? (
            <Line data={chartData} options={chartOptions} />
          ) : (
            <Typography variant="h6" align="center" color="textSecondary">
              No data to display. Adjust filters to see results.
            </Typography>
          )}
        </Box>
      </div>

      {/* Player Selection */}
      <div className="picker-panel">
        <span className="filter-label">Player selection — top 25</span>
        <List dense className="picker-list">
          {filteredPlayers.slice(0, 25).map((player) => (
            <ListItem className="player-list-item" key={player.player}>
              <Checkbox
                size="small"
                checked={selectedPlayers.some(
                  (selectedPlayer) => selectedPlayer.player === player.player
                )}
                onChange={() => handleCheckboxChange(player)}
              />
              <ListItemText
                disableTypography
                primary={
                  <span className="picker-row">
                    <span className="picker-name">{player.player}</span>
                    <span className="picker-points">
                      {player.points.toLocaleString("en-US")} pts
                    </span>
                  </span>
                }
              />
            </ListItem>
          ))}
        </List>
      </div>
    </Container>
  );
};



export default AdvancedStats;
