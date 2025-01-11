import { supabase } from "./supabaseClient";

export async function fetchTotalTournaments() {
  const { count, error } = await supabase
    .from("Tournaments")
    .select("*", { count: "exact", head: true }); // Only fetch the count

  if (error) {
    console.error("Error fetching total tournaments:", error.message);
    return 0;
  }

  return count;
}

export async function fetchPlayers(
  selectedGame = "All",
  selectedMode = "All",
  yearRange = [2000, 2023],
  lanOnly = false,
  pointsConfig = { first: 100, second: 50, top4: 25, top8: 10 },
  pointsVisibility = { first: true, second: true, top4: false, top8: true },
  gameWeights = {
    "Quake World": 100,
    "Quake 2": 100,
    "Quake 3": 100,
    "Quake 4": 100,
    "Quake Live": 100,
    "Quake Champions": 100,
    Diabotical: 100,
  },
  gameVisibility = {
    "Quake World": true,
    "Quake 2": true,
    "Quake 3": true,
    "Quake 4": true,
    "Quake Live": true,
    "Quake Champions": true,
    Diabotical: true,
  },
  tierWeights = { 1: 100, 2: 60, 3: 35, 4: 20, 5: 10 },
  tierVisibility = { 1: true, 2: true, 3: true, 4: true, 5: true }
) {
  pointsConfig = pointsConfig || { first: 100, second: 50, top4: 25, top8: 10 };
  (pointsVisibility = pointsVisibility || {
    first: true,
    second: true,
    top4: false,
    top8: true,
  }),
    (gameWeights = gameWeights || {
      "Quake World": 100,
      "Quake 2": 100,
      "Quake 3": 100,
      "Quake 4": 100,
      "Quake Live": 100,
      "Quake Champions": 100,
      Diabotical: 100,
    });
  /* console.log("fetchPlayers called with settings:", {
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
    });*/

  const { data: tournaments, error } = await supabase
    .from("Tournaments")
    .select();

  if (error) {
    console.error("Error fetching tournaments:", error.message);
    return { players: [], filteredCount: 0, totalTournaments: 0 };
  }

  let filteredCount = 0;
  const totalTournaments = tournaments.length;

  const playerStats = {};

  tournaments.forEach((tournament) => {
    // Debugging logs
    //console.log("Points Config:", pointsConfig);
    //console.log("Points Visibility:", pointsVisibility);
    //console.log("Games Config:", gameWeights);
    //console.log("Games Visibility:", gameVisibility);
    //console.log("Tier Config:", tierWeights);
    //console.log("Tier Visibility:", tierVisibility);
    //console.log("Processing tournament:", tournament);
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
    // Filter by game visibility, tier visibility, and LAN
    const isFiltered =
      !(gameVisibility[tournament.Game] ?? true) ||
      !(tierVisibility[tournament.Tier] ?? true) ||
      (lanOnly && !tournament.LAN) ||
      tournament.Year < yearRange[0] ||
      tournament.Year > yearRange[1];

    if (isFiltered) {
      filteredCount++;
      return; // Skip processing this tournament
    }

    const tierWeight = tierWeights[tournament.Tier] ?? 100;
    const gameWeight = gameWeights[tournament.Game] ?? 100;

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
          };
        }

        let points = 0;
        if (placementKey === "first") {
          points = pointsConfig.first * (tierWeight / 100) * (gameWeight / 100);
        } else if (placementKey === "second") {
          points =
            pointsConfig.second * (tierWeight / 100) * (gameWeight / 100);
        } else if (placementKey === "top4") {
          points = pointsConfig.top4 * (tierWeight / 100) * (gameWeight / 100);
        } else if (placementKey === "top8") {
          points = pointsConfig.top8 * (tierWeight / 100) * (gameWeight / 100);
        }
        playerStats[player].participations++;
        playerStats[player].points += points;
        playerStats[player].placements[placementKey]++;
        playerStats[player].games.add(tournament.Game);
        playerStats[player].modes.add(tournament.Mode);
      });
    });
  });

  return {
    players: Object.values(playerStats).map((player) => ({
      ...player,
      points: Math.round(player.points),
      games: Array.from(player.games).join(", "),
      modes: Array.from(player.modes).join(", "),
    })),
    filteredCount, // Define filteredTournamentsCount properly
    totalTournaments: tournaments.length,
  };
}
