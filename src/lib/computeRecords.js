// Pure records derivation for the /records page.
//
// Input is computeRankings' per-player output — NOT raw rows — so the gear's
// visibility toggles are already applied: a hidden game/tier/mode/placement
// simply isn't in player.tournaments, and every record recomputes under the
// visitor's formula. The prize list is the one exception: it comes from
// groupEvents (deliberately config-independent), so the same game/tier/mode
// toggles are applied here.
//
// Every list is sorted and capped at RECORD_LIMIT. Ties resolve by overall
// points (the formula's own currency), then name, so order is stable under
// any formula.

import { GAMES } from "./formulaDefaults";

export const RECORD_LIMIT = 5;
// GF conversion needs a real sample — 5/5 isn't a record, it's a small career
export const MIN_GRAND_FINALS = 10;
// co-leader names shown on a titles-by-game row before "+n"
export const LEADER_CAP = 3;

const byPointsThenName = (a, b) =>
  (b.points || 0) - (a.points || 0) || a.player.localeCompare(b.player);

// value desc → points desc → name asc, zero-value players dropped
const top = (players, getValue) =>
  players
    .filter((p) => getValue(p) > 0)
    .sort((a, b) => getValue(b) - getValue(a) || byPointsThenName(a, b))
    .slice(0, RECORD_LIMIT);

const yearBounds = (player) => {
  let from = Infinity;
  let to = -Infinity;
  player.tournaments.forEach((t) => {
    if (t.year < from) from = t.year;
    if (t.year > to) to = t.year;
  });
  return { from, to };
};

const titlesIn = (player, game) =>
  player.tournaments.filter(
    (t) => t.placement === "first" && (game == null || t.game === game)
  ).length;

export default function computeRecords(
  players,
  events,
  {
    pointsVisibility,
    gameVisibility,
    tierVisibility,
    modeVisibility,
    // the page's LAN-only plate; player records get it via computeRankings'
    // own lanOnly filter, this flag applies the same cut to the prize list
    lanOnly = false,
  }
) {
  const mostTitles = top(players, (p) => p.placements.first).map((p) => ({
    player: p.player,
    titles: p.placements.first,
    events: p.participations,
  }));

  // one row per visible game: every player tied at the max title count
  const titlesByGame = GAMES.filter((game) => gameVisibility[game] ?? true).map(
    (game) => {
      let max = 0;
      const counts = players.map((p) => {
        const n = titlesIn(p, game);
        if (n > max) max = n;
        return { p, n };
      });
      const leaders =
        max === 0
          ? []
          : counts
              .filter((x) => x.n === max)
              .map((x) => x.p)
              .sort(byPointsThenName)
              .map((p) => p.player);
      return { game, leaders, titles: max };
    }
  );

  const tier1Titles = top(players, (p) =>
    p.tournaments.filter((t) => t.placement === "first" && t.tier === 1).length
  ).map((p) => ({
    player: p.player,
    titles: p.tournaments.filter((t) => t.placement === "first" && t.tier === 1)
      .length,
    allTitles: p.placements.first,
  }));

  // null (not []) when a needed bucket is hidden: the stat is undefined under
  // this formula, which is a different message than "nobody qualifies"
  const gfConversion =
    !pointsVisibility.first || !pointsVisibility.second
      ? null
      : players
          .map((p) => {
            const finals = p.placements.first + p.placements.second;
            return {
              player: p.player,
              points: p.points,
              rate: finals > 0 ? p.placements.first / finals : 0,
              won: p.placements.first,
              finals,
            };
          })
          .filter((x) => x.finals >= MIN_GRAND_FINALS)
          .sort(
            (a, b) =>
              b.rate - a.rate || b.finals - a.finals || byPointsThenName(a, b)
          )
          .slice(0, RECORD_LIMIT)
          .map(({ player, rate, won, finals }) => ({ player, rate, won, finals }));

  const careerSpans = players
    .filter((p) => p.tournaments.length > 0)
    .map((p) => {
      const { from, to } = yearBounds(p);
      return { p, from, to, years: to - from + 1 };
    })
    .sort(
      (a, b) =>
        b.years - a.years ||
        b.p.participations - a.p.participations ||
        byPointsThenName(a.p, b.p)
    )
    .slice(0, RECORD_LIMIT)
    .map(({ p, from, to, years }) => ({ player: p.player, years, from, to }));

  const mostEvents = top(players, (p) => p.participations).map((p) => {
    const { from, to } = yearBounds(p);
    return { player: p.player, events: p.participations, from, to };
  });

  const prizeEvents = events
    .filter(
      (ev) =>
        ev.prizepool != null &&
        (!lanOnly || ev.lan) &&
        (gameVisibility[ev.game] ?? true) &&
        (tierVisibility[ev.tier] ?? true) &&
        (modeVisibility[ev.mode] ?? true)
    )
    .sort(
      (a, b) =>
        b.prizepool - a.prizepool ||
        b.year - a.year ||
        a.name.localeCompare(b.name)
    )
    .slice(0, RECORD_LIMIT)
    .map((ev) => ({
      name: ev.name,
      year: ev.year,
      game: ev.game,
      mode: ev.mode,
      winners: ev.placements.first,
      prizepool: ev.prizepool,
    }));

  return {
    mostTitles,
    titlesByGame,
    tier1Titles,
    gfConversion,
    careerSpans,
    mostEvents,
    prizeEvents,
  };
}
