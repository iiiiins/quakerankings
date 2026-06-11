// Pure scoring/filter/rank pipeline shared by PlayerList and AdvancedStats.
// Takes the raw Supabase tournament rows + the full filter/formula config and
// returns ranked players. No React, no fetching — callers memoize on their own deps.

const POWER_RANKING_LIMIT = 25; // top tournaments kept per player under Power Ranking

export default function computeRankings(
  tournamentList,
  {
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
    minEventsForPpe = 15,
  }
) {
  let filteredCount = 0;
  const playerStats = {};
  const tournamentsArray = Object.values(tournamentList || {});
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
    if (selectedGame !== tournament.Game && selectedGame !== "All") {
      filteredCount++;
      return;
    }
    if (selectedMode !== tournament.Mode && selectedMode !== "All") {
      filteredCount++;
      return;
    }
    const isFiltered =
      !(gameVisibility[tournament.Game] ?? true) ||
      !(tierVisibility[tournament.Tier] ?? true) ||
      !(modeVisibility[tournament.Mode] ?? true) ||
      (lanOnly && !tournament.LAN) ||
      tournament.Year < yearRange[0] ||
      tournament.Year > yearRange[1];

    if (isFiltered) {
      filteredCount++;
      return;
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

    Object.entries(placements).forEach(([placementKey, names]) => {
      if (!pointsVisibility[placementKey]) return;

      const namesArray = Array.isArray(names) ? names : [names];
      namesArray.forEach((name) => {
        if (!name) return;

        if (!playerStats[name]) {
          playerStats[name] = {
            player: name,
            points: 0,
            placements: { first: 0, second: 0, top4: 0, top8: 0 },
            games: new Set(),
            modes: new Set(),
            participations: 0,
            tournaments: [],
          };
        }

        const points =
          pointsConfig[placementKey] *
          (tierWeight / 100) *
          (gameWeight / 100) *
          (modeWeight / 100);

        playerStats[name].participations++;
        playerStats[name].points += points;
        playerStats[name].placements[placementKey]++;
        playerStats[name].games.add(tournament.Game);
        playerStats[name].modes.add(tournament.Mode);
        playerStats[name].tournaments.push({
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

  const players = Object.values(playerStats).map((player) => ({
    ...player,
    points: Math.round(player.points || 0),
    games: Array.from(player.games).join(", "),
    modes: Array.from(player.modes).join(", "),
  }));

  // Only a real anomaly when there was data to score — on first render the
  // tournament list is still empty and zero players is expected.
  if (totalTournaments > 0 && players.length === 0) {
    console.error("No players found in playerStats.");
  }

  if (powerRanking) {
    players.forEach((player) => {
      // Tournaments are truncated to the kept top 25 (not just summed) so that
      // downstream consumers of player.tournaments — the AdvancedStats charts —
      // plot exactly the events the power-ranking points come from.
      player.tournaments.sort((a, b) => b.points - a.points);
      player.tournaments = player.tournaments.slice(0, POWER_RANKING_LIMIT);

      player.points = Math.round(
        player.tournaments.reduce((sum, t) => sum + t.points, 0) || 0
      );
      player.placements = { first: 0, second: 0, top4: 0, top8: 0 };
      player.participations = player.tournaments.length;

      player.tournaments.forEach((t) => {
        player.placements[t.placement]++;
      });
    });
  }

  // Points per event — only meaningful past a minimum sample size; below the
  // threshold it stays null (rendered as a dash, sorted last).
  players.forEach((player) => {
    player.ppe =
      player.participations >= minEventsForPpe
        ? player.points / player.participations
        : null;
  });

  const sortedPlayers = [...players].sort((a, b) => b.points - a.points);
  sortedPlayers.forEach((player, index) => {
    player.Rank = index + 1;
  });

  return { players: sortedPlayers, filteredCount, totalTournaments };
}
