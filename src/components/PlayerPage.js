import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Container,
  Typography,
  Paper,
  Table,
  TableContainer,
  TableHead,
  TableRow,
  TableCell,
  TableSortLabel,
  TableBody,
  FormControl,
  Select,
  MenuItem,
  Slider,
} from "@mui/material";
import { supabase } from "../services/supabaseClient";
import { useNavigate } from "react-router-dom";

const CURRENT_YEAR = new Date().getFullYear();

const PlayerPage = ({
  pointsConfig,
  pointsVisibility,
  gameWeights,
  gameVisibility,
  tierWeights,
  tierVisibility,
  modeWeights,
  modeVisibility,
}) => {
  const { playerName } = useParams();
  const navigate = useNavigate();
  const [playerData, setPlayerData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState({});
  const [selectedGame, setSelectedGame] = useState("None");
  const [selectedMode, setSelectedMode] = useState("None");
  const [lanOnly, setLanOnly] = useState(false);
  const [yearRange, setYearRange] = useState([1996, CURRENT_YEAR]);
  //console.log("player page called");
  //console.log("Points Config:", pointsConfig);
  //console.log("Points Visibility:", pointsVisibility);
  //console.log("Game Weights:", gameWeights);
  //console.log("Game Visibility:", gameVisibility);
  //console.log("Tier Weights:", tierWeights);
  //console.log("Tier Visibility:", tierVisibility);
  const [stats, setStats] = useState({
    totalTournaments: 0,
    firstPlaces: 0,
    secondPlaces: 0,
    top4: 0,
    top8: 0,
    totalPlacementSum: 0,
    grandFinals: 0,
    averagePlacement: "N/A",
    grandFinalWinRate: "N/A",
  });

  useEffect(() => {
    const fetchPlayerData = async () => {
      const normalizedPlayerName = playerName.toLowerCase();

      const query = supabase.from("Tournaments").select();
      query.or([
        `1st.eq.${normalizedPlayerName}`,
        `2nd.eq.${normalizedPlayerName}`,
        `3rd.eq.${normalizedPlayerName}`,
        `4th.eq.${normalizedPlayerName}`,
        `5th.eq.${normalizedPlayerName}`,
        `6th.eq.${normalizedPlayerName}`,
        `7th.eq.${normalizedPlayerName}`,
        `8th.eq.${normalizedPlayerName}`,
      ]);

      query.gte("Year", yearRange[0]).lte("Year", yearRange[1]);

      if (selectedGame !== "None") {
        query.eq("Game", selectedGame);
      }

      if (selectedMode !== "None") {
        query.eq("Mode", selectedMode);
      }

      if (lanOnly) {
        query.eq("LAN", true);
      }

      const { data: tournaments, error } = await query;

      if (error) {
        console.error("Error fetching player data:", error.message);
        setLoading(false);
        return;
      }

      // Filter out tournaments based on visibility settings
      const filteredTournaments = tournaments.filter((tournament) => {
        // Exclude tournaments with unchecked game visibility
        if (!(gameVisibility[tournament.Game] ?? true)) {
          return false;
        }

        // Exclude tournaments with unchecked mode visibility
        if (!(modeVisibility[tournament.Mode] ?? true)) {
          return false;
        }

        // Exclude tournaments with unchecked tier visibility
        if (!(tierVisibility[tournament.Tier] ?? true)) {
          return false;
        }

        // Check if the player placed in any visible placement
        const placements = {
          first: tournament["1st"]?.toLowerCase() === normalizedPlayerName,
          second: tournament["2nd"]?.toLowerCase() === normalizedPlayerName,
          top4:
            tournament["3rd"]?.toLowerCase() === normalizedPlayerName ||
            tournament["4th"]?.toLowerCase() === normalizedPlayerName,
          top8:
            tournament["5th"]?.toLowerCase() === normalizedPlayerName ||
            tournament["6th"]?.toLowerCase() === normalizedPlayerName ||
            tournament["7th"]?.toLowerCase() === normalizedPlayerName ||
            tournament["8th"]?.toLowerCase() === normalizedPlayerName,
        };

        // Exclude tournaments if none of the visible placements match
        if (
          (placements.first && !pointsVisibility.first) ||
          (placements.second && !pointsVisibility.second) ||
          (placements.top4 && !pointsVisibility.top4) ||
          (placements.top8 && !pointsVisibility.top8)
        ) {
          return false;
        }

        return true;
      });

      const newStats = {
        totalTournaments: filteredTournaments.length,
        firstPlaces: 0,
        secondPlaces: 0,
        top4: 0,
        top8: 0,
        totalPlacements: 0,
        grandFinals: 0,
        averagePlacement: "N/A",
        grandFinalWinRate: "N/A",
      };

      let totalPlacementSum = 0;

      filteredTournaments.forEach((tournament) => {
        const placements = {
          "1st": tournament["1st"],
          "2nd": tournament["2nd"],
          "3rd": tournament["3rd"],
          "4th": tournament["4th"],
          "5th": tournament["5th"],
          "6th": tournament["6th"],
          "7th": tournament["7th"],
          "8th": tournament["8th"],
        };

        Object.entries(placements).forEach(([placement, player]) => {
          if (
            typeof player === "string" &&
            player.toLowerCase() === playerName.toLowerCase()
          ) {
            newStats.totalPlacements++;

            switch (placement) {
              case "1st":
                newStats.firstPlaces++;
                newStats.grandFinals++;
                totalPlacementSum += 1;
                break;
              case "2nd":
                newStats.secondPlaces++;
                newStats.grandFinals++;
                totalPlacementSum += 2;
                break;
              case "3rd":
              case "4th":
                newStats.top4++;
                totalPlacementSum += 3.5; // Average for top4
                break;
              case "5th":
              case "6th":
              case "7th":
              case "8th":
                newStats.top8++;
                totalPlacementSum += 6.5; // Average for top8
                break;
              default:
                break;
            }
          }
        });
      });

      newStats.averagePlacement =
        newStats.totalPlacements > 0
          ? (totalPlacementSum / newStats.totalPlacements).toFixed(2)
          : "N/A";
      newStats.grandFinalWinRate =
        newStats.grandFinals > 0
          ? ((newStats.firstPlaces / newStats.grandFinals) * 100).toFixed(2) +
            "%"
          : "N/A";

      setStats(newStats);
      const years = [...new Set(filteredTournaments.map((t) => t.Year))].sort(
        (a, b) => a - b
      );
      const yearRanges = calculateYearRanges(years);

      const groupedTournaments = {};
      let totalPoints = 0;

      filteredTournaments.forEach((tournament) => {
        const game = tournament.Game;
        const placements = {
          "1st": tournament["1st"],
          "2nd": tournament["2nd"],
          "3rd": tournament["3rd"],
          "4th": tournament["4th"],
          "5th": tournament["5th"],
          "6th": tournament["6th"],
          "7th": tournament["7th"],
          "8th": tournament["8th"],
        };

        let points = 0;
        const playerPlacement = Object.entries(placements).find(
          ([placement, player]) =>
            typeof player === "string" &&
            player.toLowerCase() === playerName.toLowerCase()
        );

        if (playerPlacement) {
          const tierWeight = tierWeights[tournament.Tier] ?? 100;
          const gameWeight = gameWeights[tournament.Game] ?? 100;
          const modeWeight = modeWeights[tournament.Mode] ?? 100;
        
          switch (playerPlacement[0]) {
            case "1st":
              points =
                (pointsConfig.first * tierWeight * gameWeight * modeWeight) / 1000000;
              break;
            case "2nd":
              points =
                (pointsConfig.second * tierWeight * gameWeight * modeWeight) / 1000000;
              break;
            case "3rd":
            case "4th":
              points =
                (pointsConfig.top4 * tierWeight * gameWeight * modeWeight) / 1000000;
              break;
            case "5th":
            case "6th":
            case "7th":
            case "8th":
              points =
                (pointsConfig.top8 * tierWeight * gameWeight * modeWeight) / 1000000;
              break;
            default:
              console.log("Unexpected Placement:", playerPlacement[0]);
              points = 0;
          }
        
          totalPoints += points;
        }


        if (!groupedTournaments[game]) {
          groupedTournaments[game] = {
            totalPoints: 0,
            tournaments: [],
          };
        }

        groupedTournaments[game].totalPoints += points;
        groupedTournaments[game].tournaments.push({
          ...tournament,
          points,
          placement: playerPlacement
            ? playerPlacement[0] === "3rd" || playerPlacement[0] === "4th"
              ? "Top4"
              : ["5th", "6th", "7th", "8th"].includes(playerPlacement[0])
              ? "Top8"
              : playerPlacement[0]
            : "N/A",
        });
      });

      setPlayerData({
        roundedPoints: Math.round(totalPoints * 10) / 10,
        groupedTournaments,
        yearRanges,
      });

      setLoading(false);
    };

    fetchPlayerData();
  }, [
    playerName,
    selectedGame,
    selectedMode,
    lanOnly,
    yearRange,
    pointsConfig,
    pointsVisibility,
    gameWeights,
    gameVisibility,
    tierWeights,
    tierVisibility,
    modeWeights,
    modeVisibility,
  ]);

  const calculateYearRanges = (years) => {
    if (!years || years.length === 0) return "";

    const ranges = [];
    let start = years[0];
    let prev = years[0];

    for (let i = 1; i < years.length; i++) {
      if (years[i] === prev + 1) {
        prev = years[i];
      } else {
        ranges.push(start === prev ? `${start}` : `${start}-${prev}`);
        start = years[i];
        prev = years[i];
      }
    }

    ranges.push(start === prev ? `${start}` : `${start}-${prev}`);
    return ranges.join(", ");
  };

  const handleSort = (game, column) => {
    const direction =
      sortConfig[game]?.column === column &&
      sortConfig[game]?.direction === "asc"
        ? "desc"
        : "asc";

    const sortedTournaments = [
      ...playerData.groupedTournaments[game].tournaments,
    ].sort((a, b) => {
      if (a[column] < b[column]) return direction === "asc" ? -1 : 1;
      if (a[column] > b[column]) return direction === "asc" ? 1 : -1;
      return 0;
    });

    setSortConfig((prev) => ({
      ...prev,
      [game]: { column, direction },
    }));

    setPlayerData((prev) => ({
      ...prev,
      groupedTournaments: {
        ...prev.groupedTournaments,
        [game]: {
          ...prev.groupedTournaments[game],
          tournaments: sortedTournaments,
        },
      },
    }));
  };

  if (loading) return <p>Loading...</p>;
  if (!playerData) return <p>No data found for player: {playerName}</p>;

  const { roundedPoints, groupedTournaments, yearRanges } = playerData;

  return (
      <Container disableGutters maxWidth={false}>
        <div className="player-hero">
          <h2 className="pp-name">{playerName}</h2>
          <div className="pp-points">
            {roundedPoints.toLocaleString("en-US")}
          </div>
          <div className="pp-sub">
            points · {stats.totalTournaments} events · active {yearRanges || "—"}
          </div>
          <div className="pp-stats">
            <span className="pm-g">{stats.firstPlaces}<i>1ST</i></span>
            <span className="pm-s">{stats.secondPlaces}<i>2ND</i></span>
            <span className="pm-b">{stats.top4}<i>T4</i></span>
            <span className="pm-c">{stats.top8}<i>T8</i></span>
            <span className="pp-extra">
              Avg placement <b>{stats.averagePlacement}</b>
            </span>
            <span className="pp-extra">
              GF win rate <b>{stats.grandFinalWinRate}</b>
            </span>
          </div>
        </div>

        <div className="filter-bar">
          <div className="filter-field">
            <span className="filter-label">Game</span>
            <FormControl size="small" style={{ minWidth: "170px" }}>
              <Select
                value={selectedGame}
                onChange={(e) => setSelectedGame(e.target.value)}
              >
                <MenuItem value="None">All Games</MenuItem>
                <MenuItem value="Quake World">Quake World</MenuItem>
                <MenuItem value="Quake 2">Quake 2</MenuItem>
                <MenuItem value="Quake 3">Quake 3</MenuItem>
                <MenuItem value="Quake 4">Quake 4</MenuItem>
                <MenuItem value="Quake Live">Quake Live</MenuItem>
                <MenuItem value="Quake Champions">Quake Champions</MenuItem>
                <MenuItem value="Diabotical">Diabotical</MenuItem>
              </Select>
            </FormControl>
          </div>
          <div className="filter-field">
            <span className="filter-label">Mode</span>
            <FormControl size="small" style={{ minWidth: "170px" }}>
              <Select
                value={selectedMode}
                onChange={(e) => setSelectedMode(e.target.value)}
              >
                <MenuItem value="None">All Modes</MenuItem>
                <MenuItem value="Duel">Duel</MenuItem>
                <MenuItem value="2v2">2vs2</MenuItem>
                <MenuItem value="TDM">Team Deathmatch 4v4</MenuItem>
                <MenuItem value="CTF">Capture the Flag</MenuItem>
                <MenuItem value="CA">Clan Arena</MenuItem>
                <MenuItem value="SAC">Sacrifice</MenuItem>
                <MenuItem value="WIP">Wipeout</MenuItem>
                <MenuItem value="DBT">McGuffin+Extinction+Wipeout</MenuItem>
              </Select>
            </FormControl>
          </div>
          <div className="filter-field years-field">
            <span className="filter-label">Years</span>
            <div className="yearline">
              <Slider
                value={yearRange}
                onChange={(e, newValue) => setYearRange(newValue)}
                valueLabelDisplay="auto"
                min={1996}
                max={CURRENT_YEAR}
              />
              <span className="yearval">
                {yearRange[0]}–{yearRange[1]}
              </span>
            </div>
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
          </div>
        </div>
        {Object.entries(groupedTournaments).map(([game, data]) => (
          <Paper key={game} elevation={0} className="game-section">
            <div className="game-section-head">
              <Typography component="h3" className="game-section-title">
                {game}
              </Typography>
              <span className="game-section-points">
                {(Math.round(data.totalPoints * 10) / 10).toLocaleString("en-US")} pts
              </span>
            </div>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell onClick={() => handleSort(game, "Event_Name")}>
                      <TableSortLabel
                        active={sortConfig[game]?.column === "Event_Name"}
                        direction={
                          sortConfig[game]?.column === "Event_Name"
                            ? sortConfig[game]?.direction
                            : "asc"
                        }
                        onClick={() => handleSort(game, "Event_Name")}
                      >
                        Event Name
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>
                      <TableSortLabel
                        active={sortConfig[game]?.column === "Mode"}
                        direction={
                          sortConfig[game]?.column === "Mode"
                            ? sortConfig[game]?.direction
                            : "asc"
                        }
                        onClick={() => handleSort(game, "Mode")}
                      >
                        Mode
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>
                      <TableSortLabel
                        active={sortConfig[game]?.column === "Year"}
                        direction={
                          sortConfig[game]?.column === "Year"
                            ? sortConfig[game]?.direction
                            : "asc"
                        }
                        onClick={() => handleSort(game, "Year")}
                      >
                        Year
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>
                      <TableSortLabel
                        active={sortConfig[game]?.column === "placement"}
                        direction={
                          sortConfig[game]?.column === "placement"
                            ? sortConfig[game]?.direction
                            : "asc"
                        }
                        onClick={() => handleSort(game, "placement")}
                      >
                        Placement
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>
                      <TableSortLabel
                        active={sortConfig[game]?.column === "LAN"}
                        direction={
                          sortConfig[game]?.column === "LAN"
                            ? sortConfig[game]?.direction
                            : "asc"
                        }
                        onClick={() => handleSort(game, "LAN")}
                      >
                        LAN
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>
                      <TableSortLabel
                        active={sortConfig[game]?.column === "Tier"}
                        direction={
                          sortConfig[game]?.column === "Tier"
                            ? sortConfig[game]?.direction
                            : "asc"
                        }
                        onClick={() => handleSort(game, "Tier")}
                      >
                        Tier
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>
                      <TableSortLabel
                        active={sortConfig[game]?.column === "points"}
                        direction={
                          sortConfig[game]?.column === "points"
                            ? sortConfig[game]?.direction
                            : "asc"
                        }
                        onClick={() => handleSort(game, "points")}
                      >
                        Points
                      </TableSortLabel>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.tournaments.map((tournament) => (
                    <TableRow key={tournament.id}>
                      <TableCell>{tournament.Event_Name}</TableCell>
                      <TableCell>{tournament.Mode}</TableCell>
                      <TableCell>{tournament.Year}</TableCell>
                      <TableCell
                        className={
                          tournament.placement === "1st"
                            ? "gold-placement"
                            : tournament.placement === "2nd"
                            ? "silver-placement"
                            : tournament.placement === "Top4"
                            ? "bronze-placement"
                            : tournament.placement === "Top8"
                            ? "copper-placement"
                            : ""
                        }
                      >
                        {tournament.placement}
                      </TableCell>
                      <TableCell>{tournament.LAN ? "LAN" : "Online"}</TableCell>
                      <TableCell>{tournament.Tier}</TableCell>
                      <TableCell>{tournament.points}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        ))}
      </Container>
  );
};

export default PlayerPage;
