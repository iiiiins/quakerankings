import React, { useState, useEffect, useMemo } from "react";
import {
  Button,
  Container,
  Typography,
  FormControl,
  Select,
  List,
  ListItem,
  ListItemText,
  TextField,
  MenuItem,
  Box,
  Slider,
  Checkbox,
} from "@mui/material";
import useTournaments from "../hooks/useTournaments";
import computeRankings from "../lib/computeRankings";
import { Line } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend } from "chart.js";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

const CURRENT_YEAR = new Date().getFullYear();

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

const getPlayerColor = (playerName) => {
  const colors = [
    "#FF5733", "#33FF57", "#3357FF", "#F3FF33", "#FF33A1",
    "#33FFF1", "#FFA833", "#8333FF", "#33FF83", "#FF3381",
  ];
  const hash = Array.from(playerName).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
};

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
  const [selectedGame, setSelectedGame] = useState("All");
  const [selectedMode, setSelectedMode] = useState("All");
  const [yearRange, setYearRange] = useState([1996, CURRENT_YEAR]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [lanOnly, setLanOnly] = useState(false);
  const [powerRanking, setPowerRanking] = useState(false);
  const [selectedPlayers, setSelectedPlayers] = useState([]);
  const [chartTitle, setChartTitle] = useState("Overall Max Points Over Time");
  const [selectedToggle, setSelectedToggle] = useState("overall"); // 'performance' or 'overall'
  const [chartData, setChartData] = useState({ labels: [], datasets: [] });

  const tournamentList = useTournaments();

  const { players, filteredCount, totalTournaments } = useMemo(
    () =>
      computeRankings(tournamentList, {
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
      }),
    [
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
    ]
  );

  // Per-player points-by-year, the single source for chart + picker (the old
  // version had two competing effects both resetting the selection)
  const processedPlayers = useMemo(
    () =>
      players.map((player) => {
        const pointsByYear = {};
        player.tournaments.forEach((tournament) => {
          const year = tournament.year;
          pointsByYear[year] = (pointsByYear[year] || 0) + tournament.points;
        });
        return { ...player, pointsByYear };
      }),
    [players]
  );

  // Default chart selection: top 5 under the current filters/formula
  useEffect(() => {
    setSelectedPlayers(processedPlayers.slice(0, 5));
  }, [processedPlayers]);

  // Selecting players
  const handleCheckboxChange = (player) => {
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

  const handleYearRangeChange = (event, newValue) => {
    setYearRange(newValue);
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
    if (query.trim() === "") {
      setSearchResults([]);
      return;
    }

    const results = processedPlayers
      .filter((player) =>
        player.player.toLowerCase().includes(query.toLowerCase())
      )
      .slice(0, 10); // Show top 10 matches
    setSearchResults(results);
  };

  const handleAddPlayer = (player) => {
    setSearchQuery(""); // Clear search
    setSearchResults([]); // Clear results

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
        <b>{processedPlayers.length.toLocaleString("en-US")}</b> players ·{" "}
        <b>{(totalTournaments - filteredCount).toLocaleString("en-US")}</b>{" "}
        tournaments · {filteredCount.toLocaleString("en-US")} filtered
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
          {processedPlayers.slice(0, 25).map((player) => (
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
