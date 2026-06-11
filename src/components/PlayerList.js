import React, { useState, useEffect, useMemo } from "react";
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
  Select,
  TextField,
  MenuItem,
  Slider,
  Drawer,
  Button,
  useMediaQuery,
} from "@mui/material";
import useTournaments from "../hooks/useTournaments";
import computeRankings from "../lib/computeRankings";
import diaboticalLogo from "../logos/diabotical_logo.png";
import quakeWorldLogo from "../logos/quakeworld_logo.png";
import quake2Logo from "../logos/quake2_logo.png";
import quake3Logo from "../logos/quake3_logo.png";
import quake4Logo from "../logos/quake4_logo.png";
import quakeLiveLogo from "../logos/quakelive_logo.png";
import quakeChampionsLogo from "../logos/quakechampions_logo.png";

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

const sortPlayers = (list, column, order) => {
  const key = columnKeyMap[column] || column;
  const dir = order === "asc" ? 1 : -1;

  return [...list].sort((a, b) => {
    if (column === "player") {
      return dir * a.player.localeCompare(b.player);
    }

    let valA, valB;
    if (column === "games" || column === "modes") {
      valA = a[column] ? a[column].split(", ").length : 0;
      valB = b[column] ? b[column].split(", ").length : 0;
    } else {
      valA = key.split(".").reduce((obj, keyPart) => obj?.[keyPart] || 0, a);
      valB = key.split(".").reduce((obj, keyPart) => obj?.[keyPart] || 0, b);
    }
    return dir * (valA - valB);
  });
};

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
  const [sortBy, setSortBy] = useState("Points");
  const [sortOrder, setSortOrder] = useState("desc");
  const [selectedGame, setSelectedGame] = useState("All");
  const [selectedMode, setSelectedMode] = useState("All");
  const [yearRange, setYearRange] = useState([1996, CURRENT_YEAR]);
  const [searchQuery, setSearchQuery] = useState("");
  const [lanOnly, setLanOnly] = useState(false);
  const [powerRanking, setPowerRanking] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [loadMore, setLoadMore] = useState(100);
  const isMobile = useMediaQuery("(max-width:899px)");

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

  // Search + column sort applied on top of the ranked list
  const filteredPlayers = useMemo(() => {
    const searched = searchQuery
      ? players.filter((p) => p.player.toLowerCase().includes(searchQuery))
      : players;
    return sortPlayers(searched, sortBy, sortOrder);
  }, [players, searchQuery, sortBy, sortOrder]);

  const visiblePlayers = filteredPlayers.slice(0, loadMore);

  // Reset the scroll pager whenever the ranking itself changes
  useEffect(() => {
    setLoadMore(100);
  }, [players]);

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

  const handleSort = (column) => {
    const isAsc = sortBy === column && sortOrder === "asc";
    setSortBy(column);
    setSortOrder(isAsc ? "desc" : "asc");
  };

  const handleYearRangeChange = (event, newValue) => {
    setYearRange(newValue);
  };

  const handleSearch = (event) => {
    setSearchQuery(event.target.value.toLowerCase());
  };

  const maxPoints = players.length > 0 ? players[0].points : 0;
  const podiumPlayers =
    players.length >= 3 ? [players[1], players[0], players[2]] : [];

  return (
    <Container disableGutters maxWidth={false}>
      {isMobile && (
        <>
          <div className="chip-rail">
            <button
              type="button"
              className="ph-chip"
              onClick={() => setFiltersOpen(true)}
            >
              {selectedGame === "All" ? "All games" : selectedGame} ▾
            </button>
            <button
              type="button"
              className="ph-chip"
              onClick={() => setFiltersOpen(true)}
            >
              {selectedMode === "All" ? "All modes" : selectedMode} ▾
            </button>
            <button
              type="button"
              className="ph-chip"
              onClick={() => setFiltersOpen(true)}
            >
              {yearRange[0]}–{yearRange[1]}
            </button>
            <button
              type="button"
              className={`ph-chip${lanOnly ? " on" : ""}`}
              onClick={() => setLanOnly(!lanOnly)}
            >
              LAN
            </button>
            <button
              type="button"
              className={`ph-chip${powerRanking ? " on" : ""}`}
              onClick={() => setPowerRanking(!powerRanking)}
            >
              Power
            </button>
          </div>
          {podiumPlayers.length === 3 && (
            <>
              <div className="ph-pod">
                <div className="pmedal">1</div>
                <div className="pname">
                  <Link to={`/players/${players[0].player}`}>
                    {players[0].player}
                  </Link>
                </div>
                <div className="ppoints">
                  {(players[0].points || 0).toLocaleString("en-US")}
                </div>
                <div className="plabel">
                  {players[0].placements?.first || 0} firsts ·{" "}
                  {players[0].participations || 0} events
                </div>
              </div>
              <div className="ph-podrow">
                {[players[1], players[2]].map((p) => (
                  <div key={p.player} className={`ph-pod sm s${p.Rank}`}>
                    <div className="pmedal">{p.Rank}</div>
                    <div className="pname">
                      <Link to={`/players/${p.player}`}>{p.player}</Link>
                    </div>
                    <div className="ppoints">
                      {(p.points || 0).toLocaleString("en-US")}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* Podium — top 3 under the current filters/formula */}
      {!isMobile && podiumPlayers.length === 3 && (
        <div className="podium">
          {podiumPlayers.map((p) => (
            <div key={p.player} className={`pcard p${p.Rank}`}>
              <div className="pmedal">{p.Rank}</div>
              <div className="pname">
                <Link to={`/players/${p.player}`}>{p.player}</Link>
              </div>
              <div className="ppoints">{(p.points || 0).toLocaleString("en-US")}</div>
              <div className="plabel">points · {p.participations || 0} events</div>
              <div className="plogos">
                {p.games.split(", ").map((game) =>
                  gameLogos[game] ? (
                    <img key={game} src={gameLogos[game]} alt={game} title={game} />
                  ) : null
                )}
              </div>
              <div className="pmedals">
                <span className="pm-g">{p.placements?.first || 0}<i>1ST</i></span>
                <span className="pm-s">{p.placements?.second || 0}<i>2ND</i></span>
                <span className="pm-b">{p.placements?.top4 || 0}<i>T4</i></span>
                <span className="pm-c">{p.placements?.top8 || 0}<i>T8</i></span>
              </div>
            </div>
          ))}
        </div>
      )}

      {!isMobile && (
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

        <div className="filter-field search-field">
          <span className="filter-label">Search</span>
          <TextField
            size="small"
            placeholder="Search player…"
            variant="outlined"
            value={searchQuery}
            onChange={handleSearch}
            fullWidth
          />
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
      )}

      {/* Summary Message */}
      <Typography component="div" className="summary-line">
        <b>{filteredPlayers.length.toLocaleString("en-US")}</b> players ·{" "}
        <b>{(totalTournaments - filteredCount).toLocaleString("en-US")}</b>{" "}
        tournaments · {filteredCount.toLocaleString("en-US")} filtered
      </Typography>

      {isMobile ? (
        <div className="ph-list">
          {(searchQuery ? visiblePlayers : visiblePlayers.filter((p) => p.Rank > 3)).map(
            (player) => (
              <Link
                key={player.player}
                className="ph-row"
                to={`/players/${player.player}`}
              >
                <span className="rk">{String(player.Rank).padStart(2, "0")}</span>
                <span className="nm">{player.player}</span>
                <span className="dots">
                  <span className="d-g"><i />{player.placements?.first || 0}</span>
                  <span className="d-s"><i />{player.placements?.second || 0}</span>
                  <span className="d-b"><i />{player.placements?.top4 || 0}</span>
                  <span className="d-c"><i />{player.placements?.top8 || 0}</span>
                </span>
                <span className="pt">{(player.points || 0).toLocaleString("en-US")}</span>
              </Link>
            )
          )}
        </div>
      ) : (
      <TableContainer component={Paper} elevation={0} className="board">

        <Table>
          <TableHead>
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
              <TableCell className="th-left">
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
                  Games
                </TableSortLabel>
              </TableCell>
              <TableCell className="th-left">
                <TableSortLabel
                  active={sortBy === "modes"}
                  direction={sortBy === "modes" ? sortOrder : "asc"}
                  onClick={() => handleSort("modes")}
                >
                  Modes
                </TableSortLabel>
              </TableCell>
              <TableCell className="gold-header">
                <TableSortLabel
                  active={sortBy === "1st"}
                  direction={sortBy === "1st" ? sortOrder : "asc"}
                  onClick={() => handleSort("1st")}
                >
                  1st
                </TableSortLabel>
              </TableCell>
              <TableCell className="silver-header">
                <TableSortLabel
                  active={sortBy === "2nd"}
                  direction={sortBy === "2nd" ? sortOrder : "asc"}
                  onClick={() => handleSort("2nd")}
                >
                  2nd
                </TableSortLabel>
              </TableCell>
              <TableCell className="bronze-header">
                <TableSortLabel
                  active={sortBy === "Top4"}
                  direction={sortBy === "Top4" ? sortOrder : "asc"}
                  onClick={() => handleSort("Top4")}
                >
                  Top 4
                </TableSortLabel>
              </TableCell>
              <TableCell className="copper-header">
                <TableSortLabel
                  active={sortBy === "Top8"}
                  direction={sortBy === "Top8" ? sortOrder : "asc"}
                  onClick={() => handleSort("Top8")}
                >
                  Top 8
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortBy === "participations"}
                  direction={sortBy === "participations" ? sortOrder : "asc"}
                  onClick={() => handleSort("participations")}
                >
                  Events
                </TableSortLabel>
              </TableCell>
              <TableCell className="th-right">
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
                <TableCell colSpan={10} align="center">
                  No results found
                </TableCell>
              </TableRow>
            ) : (
              visiblePlayers.map((player) => {
                const modesArr = player.modes ? player.modes.split(", ") : [];
                return (
                  <TableRow
                    key={player.player}
                    className={player.Rank <= 3 ? `row-${player.Rank}` : undefined}
                  >
                    <TableCell className="rank-cell">
                      {String(player.Rank).padStart(2, "0")}
                    </TableCell>
                    <TableCell className="players-list">
                      <Link to={`/players/${player.player}`}>
                        {player.player}
                      </Link>
                    </TableCell>
                    <TableCell className="games-list">
                      {player.games.split(", ").map((game) =>
                        gameLogos[game] ? (
                          <img
                            key={game}
                            src={gameLogos[game]}
                            alt={game}
                            title={game}
                          />
                        ) : null
                      )}
                    </TableCell>
                    <TableCell className="modes-list">
                      {modesArr.slice(0, 2).join(" / ") || "N/A"}
                      {modesArr.length > 2 && (
                        <span className="modes-more" title={player.modes}>
                          +{modesArr.length - 2}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="gold-placement">
                      {player.placements?.first || 0}
                    </TableCell>
                    <TableCell className="silver-placement">
                      {player.placements?.second || 0}
                    </TableCell>
                    <TableCell className="bronze-placement">
                      {player.placements?.top4 || 0}
                    </TableCell>
                    <TableCell className="copper-placement">
                      {player.placements?.top8 || 0}
                    </TableCell>
                    <TableCell>{player.participations || 0}</TableCell>
                    <TableCell className="points-cell" align="right">
                      <span className="pwrap">
                        {(player.points || 0).toLocaleString("en-US")}
                        <span
                          className="pbar"
                          style={{
                            width: `${Math.max(
                              8,
                              Math.round(((player.points || 0) / (maxPoints || 1)) * 100)
                            )}%`,
                          }}
                        />
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>
      )}
      {visiblePlayers.length < filteredPlayers.length && (
        <div className="loadhint">Scroll — next 100 load automatically</div>
      )}

      {isMobile && (
        <Drawer
          anchor="bottom"
          open={filtersOpen}
          onClose={() => setFiltersOpen(false)}
        >
          <div className="filter-sheet">
            <div className="sheet-grab" />
            <span className="filter-label">Search</span>
            <TextField
              size="small"
              placeholder="Search player…"
              variant="outlined"
              value={searchQuery}
              onChange={handleSearch}
              fullWidth
            />
            <span className="filter-label">Game</span>
            <FormControl size="small" fullWidth>
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
            <span className="filter-label">Mode</span>
            <FormControl size="small" fullWidth>
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
            <span className="filter-label">
              Years · {yearRange[0]}–{yearRange[1]}
            </span>
            <Slider
              value={yearRange}
              onChange={handleYearRangeChange}
              valueLabelDisplay="auto"
              min={1996}
              max={CURRENT_YEAR}
              step={1}
            />
            <div className="toggle-plates">
              <button
                type="button"
                className={`plate${lanOnly ? " on" : ""}`}
                onClick={() => setLanOnly(!lanOnly)}
              >
                <span className="led" />
                LAN Only
              </button>
              <button
                type="button"
                className={`plate${powerRanking ? " on" : ""}`}
                onClick={() => setPowerRanking(!powerRanking)}
              >
                <span className="led" />
                Power Ranking
              </button>
            </div>
            <Button
              variant="contained"
              color="primary"
              onClick={() => setFiltersOpen(false)}
            >
              Done
            </Button>
          </div>
        </Drawer>
      )}
    </Container>
  );
};

export default PlayerList;
