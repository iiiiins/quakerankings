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
  IconButton,
  useMediaQuery,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import EditNoteIcon from "@mui/icons-material/EditNote";
import useTournaments from "../hooks/useTournaments";
import useSession from "../hooks/useSession";
import groupEvents from "../lib/groupEvents";
import gameLogos from "../lib/gameLogos";
import EventEditDialog from "./EventEditDialog";
import SuggestDialog from "./SuggestDialog";

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

const tiers = ["All", 1, 2, 3, 4, 5];

const sortEvents = (list, column, order) => {
  const dir = order === "asc" ? 1 : -1;
  const byNewest = (a, b) => b.year - a.year || a.name.localeCompare(b.name);

  return [...list].sort((a, b) => {
    if (column === "name") {
      return dir * a.name.localeCompare(b.name) || byNewest(a, b);
    }
    // Events without a recorded prize pool always sort last, in either direction
    if (column === "prizepool") {
      if (a.prizepool == null || b.prizepool == null) {
        if (a.prizepool == null && b.prizepool == null) return byNewest(a, b);
        return a.prizepool == null ? 1 : -1;
      }
      return dir * (a.prizepool - b.prizepool) || byNewest(a, b);
    }
    if (column === "tier") {
      return dir * (a.tier - b.tier) || byNewest(a, b);
    }
    return dir * (a.year - b.year) || a.name.localeCompare(b.name);
  });
};

const formatPrize = (prizepool) =>
  prizepool == null ? null : `$${prizepool.toLocaleString("en-US")}`;

const PodiumNames = ({ names }) =>
  names.length === 0 ? (
    <span className="ppe-dash">—</span>
  ) : (
    names.map((name, i) => (
      <React.Fragment key={name}>
        {/* the trailing space is a soft-wrap point — without it the nowrap
            links form one unbreakable run that overflows the cell */}
        {i > 0 && <span className="ev-sep">{"· "}</span>}
        <Link to={`/players/${name}`}>{name}</Link>
      </React.Fragment>
    ))
  );

const EventsBrowser = () => {
  const [sortBy, setSortBy] = useState("year");
  const [sortOrder, setSortOrder] = useState("desc");
  const [selectedGame, setSelectedGame] = useState("All");
  const [selectedTier, setSelectedTier] = useState("All");
  const [yearRange, setYearRange] = useState([1996, CURRENT_YEAR]);
  const [searchQuery, setSearchQuery] = useState("");
  const [lanOnly, setLanOnly] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [loadMore, setLoadMore] = useState(100);
  const [editingKey, setEditingKey] = useState(null);
  const [suggesting, setSuggesting] = useState(null); // grouped event | "new" | null
  const isMobile = useMediaQuery("(max-width:899px)");

  const tournamentList = useTournaments();
  const { session } = useSession();
  const events = useMemo(() => groupEvents(tournamentList), [tournamentList]);

  // Admin corrections are a desktop task — mobile rows stay read-only
  const canEdit = Boolean(session) && !isMobile;
  // Public suggestions are anon-only (RLS: an authenticated session can't
  // INSERT submissions) — signed-out gets suggest, signed-in gets the pencil
  const canSuggest = !session;
  // Derived by key so a cache refresh swaps in fresh rows (or closes the
  // dialog if the edit changed the event's identity)
  const editingEvent = canEdit
    ? events.find((ev) => ev.key === editingKey) || null
    : null;

  const filteredEvents = useMemo(
    () =>
      events.filter(
        (ev) =>
          (selectedGame === "All" || ev.game === selectedGame) &&
          (selectedTier === "All" || ev.tier === selectedTier) &&
          ev.year >= yearRange[0] &&
          ev.year <= yearRange[1] &&
          (!lanOnly || ev.lan) &&
          (!searchQuery || ev.name.toLowerCase().includes(searchQuery))
      ),
    [events, selectedGame, selectedTier, yearRange, lanOnly, searchQuery]
  );

  const sortedEvents = useMemo(
    () => sortEvents(filteredEvents, sortBy, sortOrder),
    [filteredEvents, sortBy, sortOrder]
  );

  const visibleEvents = sortedEvents.slice(0, loadMore);

  // Reset the scroll pager whenever the visible ordering changes
  useEffect(() => {
    setLoadMore(100);
  }, [sortedEvents]);

  useEffect(() => {
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
      if (scrollTop + clientHeight >= scrollHeight - 10) {
        setLoadMore((prev) => prev + 100); // Load 100 more events
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

  const tierLabel = (tier) => (tier === "All" ? "All tiers" : `Tier ${tier}`);

  return (
    <Container disableGutters maxWidth={false}>
      {isMobile && (
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
            {tierLabel(selectedTier)} ▾
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
            <span className="filter-label">Tier</span>
            <FormControl size="small" style={{ minWidth: "110px" }}>
              <Select
                value={selectedTier}
                onChange={(e) => setSelectedTier(e.target.value)}
                renderValue={tierLabel}
              >
                {tiers.map((tier) => (
                  <MenuItem key={tier} value={tier}>
                    {tier === "All" ? "All" : `Tier ${tier}`}
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
              placeholder="Search event…"
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
          </div>
        </div>
      )}

      {/* Summary Message + public "submit a tournament" entry point */}
      <div className="summary-row">
        <Typography component="div" className="summary-line">
          <b>{sortedEvents.length.toLocaleString("en-US")}</b> events ·{" "}
          <b>{(events.length - sortedEvents.length).toLocaleString("en-US")}</b>{" "}
          filtered
        </Typography>
        {canSuggest && (
          <button
            type="button"
            className="ev-suggest-new"
            onClick={() => setSuggesting("new")}
          >
            + Submit a tournament
          </button>
        )}
      </div>

      {isMobile ? (
        <div className="ev-list">
          {sortedEvents.length === 0 ? (
            <div className="ev-empty">No events found</div>
          ) : (
            visibleEvents.map((ev) => (
              <div key={ev.key} className="ev-row">
                {gameLogos[ev.game] && (
                  <img
                    className="ev-glogo"
                    src={gameLogos[ev.game]}
                    alt={ev.game}
                    title={ev.game}
                  />
                )}
                <div className="ev-main">
                  <span className="ev-mname">
                    {ev.name}
                    {ev.lan && <span className="lan-tag">LAN</span>}
                  </span>
                  <span className="ev-msub">
                    {ev.year} · {ev.mode} · T{ev.tier}
                    {ev.prizepool != null && ` · ${formatPrize(ev.prizepool)}`}
                  </span>
                </div>
                <span className="ev-mwin">
                  {ev.placements.first.length === 0 ? (
                    <span className="ppe-dash">—</span>
                  ) : (
                    ev.placements.first.map((name) => (
                      <Link key={name} to={`/players/${name}`}>
                        {name}
                      </Link>
                    ))
                  )}
                </span>
                {canSuggest && (
                  <IconButton
                    size="small"
                    className="ev-suggest"
                    aria-label={`Suggest a fix for ${ev.name}`}
                    onClick={() => setSuggesting(ev)}
                  >
                    <EditNoteIcon fontSize="inherit" />
                  </IconButton>
                )}
              </div>
            ))
          )}
        </div>
      ) : (
        <TableContainer component={Paper} elevation={0} className="board">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>
                  <TableSortLabel
                    active={sortBy === "year"}
                    direction={sortBy === "year" ? sortOrder : "asc"}
                    onClick={() => handleSort("year")}
                  >
                    Year
                  </TableSortLabel>
                </TableCell>
                <TableCell className="th-left">
                  <TableSortLabel
                    active={sortBy === "name"}
                    direction={sortBy === "name" ? sortOrder : "asc"}
                    onClick={() => handleSort("name")}
                  >
                    Event
                  </TableSortLabel>
                </TableCell>
                <TableCell>Game</TableCell>
                <TableCell>Mode</TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortBy === "tier"}
                    direction={sortBy === "tier" ? sortOrder : "asc"}
                    onClick={() => handleSort("tier")}
                  >
                    Tier
                  </TableSortLabel>
                </TableCell>
                <TableCell className="th-right">
                  <TableSortLabel
                    active={sortBy === "prizepool"}
                    direction={sortBy === "prizepool" ? sortOrder : "asc"}
                    onClick={() => handleSort("prizepool")}
                  >
                    Prize
                  </TableSortLabel>
                </TableCell>
                <TableCell className="gold-header">1st</TableCell>
                <TableCell className="silver-header">2nd</TableCell>
                <TableCell className="bronze-header">Top 4</TableCell>
                {/* trailing action column: admin pencil or public suggest */}
                <TableCell className="edit-cell" />
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedEvents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} align="center">
                    No events found
                  </TableCell>
                </TableRow>
              ) : (
                visibleEvents.map((ev) => (
                  <TableRow key={ev.key}>
                    <TableCell className="ev-year">{ev.year}</TableCell>
                    <TableCell className="ev-name">
                      {/* block wrapper caps the column width so long names wrap
                          instead of growing the auto-layout table */}
                      <div className="ev-namewrap">
                        {ev.name}
                        {ev.lan && <span className="lan-tag">LAN</span>}
                      </div>
                    </TableCell>
                    <TableCell className="games-list">
                      {gameLogos[ev.game] ? (
                        <img
                          src={gameLogos[ev.game]}
                          alt={ev.game}
                          title={ev.game}
                        />
                      ) : (
                        ev.game
                      )}
                    </TableCell>
                    <TableCell className="ev-mode">{ev.mode}</TableCell>
                    <TableCell>{ev.tier}</TableCell>
                    <TableCell className="prize-cell">
                      {ev.prizepool == null ? (
                        <span className="ppe-dash">—</span>
                      ) : (
                        formatPrize(ev.prizepool)
                      )}
                    </TableCell>
                    <TableCell className="gold-placement ev-podium">
                      <div className="ev-names">
                        <PodiumNames names={ev.placements.first} />
                      </div>
                    </TableCell>
                    <TableCell className="silver-placement ev-podium">
                      <div className="ev-names">
                        <PodiumNames names={ev.placements.second} />
                      </div>
                    </TableCell>
                    <TableCell className="bronze-placement ev-podium">
                      <div className="ev-names">
                        <PodiumNames names={ev.placements.top4} />
                      </div>
                    </TableCell>
                    <TableCell className="edit-cell">
                      {canEdit ? (
                        <IconButton
                          size="small"
                          aria-label={`Edit ${ev.name}`}
                          onClick={() => setEditingKey(ev.key)}
                        >
                          <EditIcon fontSize="inherit" />
                        </IconButton>
                      ) : (
                        canSuggest && (
                          <IconButton
                            size="small"
                            aria-label={`Suggest a fix for ${ev.name}`}
                            title="Suggest a fix"
                            onClick={() => setSuggesting(ev)}
                          >
                            <EditNoteIcon fontSize="inherit" />
                          </IconButton>
                        )
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      {canEdit && (
        <EventEditDialog
          event={editingEvent}
          onClose={() => setEditingKey(null)}
        />
      )}
      <SuggestDialog target={suggesting} onClose={() => setSuggesting(null)} />
      {visibleEvents.length < sortedEvents.length && (
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
              placeholder="Search event…"
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
            <span className="filter-label">Tier</span>
            <FormControl size="small" fullWidth>
              <Select
                value={selectedTier}
                onChange={(e) => setSelectedTier(e.target.value)}
              >
                {tiers.map((tier) => (
                  <MenuItem key={tier} value={tier}>
                    {tier === "All" ? "All" : `Tier ${tier}`}
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

export default EventsBrowser;
