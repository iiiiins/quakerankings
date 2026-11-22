// Quiz: guess the hidden player, one of the top 100 on the default all-time
// board. Clue 1 is the years active, clue 2 every game they played (main
// game first), then titles, LAN events, best finish and the
// name's first letter; one more clue unlocks per wrong guess. Each guess is
// compared with the answer: same main game or not, earlier or later start,
// more or fewer titles and LAN events.
//
// Pure: no React.

import computeRankings from "./computeRankings";
import {
  GAMES,
  CURRENT_YEAR,
  YEAR_MIN,
  DEFAULT_POINTS_CONFIG,
  DEFAULT_POINTS_VISIBILITY,
  DEFAULT_GAME_WEIGHTS,
  DEFAULT_GAME_VISIBILITY,
  DEFAULT_TIER_WEIGHTS,
  DEFAULT_TIER_VISIBILITY,
  DEFAULT_MODE_WEIGHTS,
  DEFAULT_MODE_VISIBILITY,
} from "./formulaDefaults";

const BUCKETS = ["first", "second", "top4", "top8"];

// grouped events -> name -> { name, first, last, gameList (main first),
//   mainGame, events, titles, lan, bestFinish: { event, bucket } }
export function buildProfiles(events) {
  const prof = new Map();
  events.forEach((ev) => {
    const where = new Map();
    BUCKETS.forEach((b) => ev.placements[b].forEach((n) => !where.has(n) && where.set(n, b)));
    where.forEach((bucket, name) => {
      if (!prof.has(name)) {
        prof.set(name, { name, first: ev.year, last: ev.year, games: new Map(), events: 0, titles: 0, lan: 0, bestFinish: null });
      }
      const p = prof.get(name);
      p.first = Math.min(p.first, ev.year);
      p.last = Math.max(p.last, ev.year);
      p.games.set(ev.game, (p.games.get(ev.game) || 0) + 1);
      p.events++;
      if (ev.lan) p.lan++;
      if (bucket === "first") p.titles++;
      // best result: biggest event first (tier), then finish, then prize, so a
      // top 4 at a world final beats a win at a weekly online cup
      const rank = BUCKETS.indexOf(bucket);
      const cur = p.bestFinish;
      if (
        !cur ||
        ev.tier < cur.event.tier ||
        (ev.tier === cur.event.tier &&
          (rank < BUCKETS.indexOf(cur.bucket) ||
            (rank === BUCKETS.indexOf(cur.bucket) && (ev.prizepool || 0) > (cur.event.prizepool || 0))))
      ) {
        p.bestFinish = { event: ev, bucket };
      }
    });
  });
  prof.forEach((p) => {
    // most results first; ties go to the older game (GAMES order)
    p.gameList = [...p.games.entries()]
      .sort((a, b) => b[1] - a[1] || GAMES.indexOf(a[0]) - GAMES.indexOf(b[0]))
      .map(([g]) => g);
    p.mainGame = p.gameList[0];
  });
  return prof;
}

// The answers: the top `n` of the default all-time board (the home page with
// nothing changed), so every answer is a name fans know.
export function topPool(rows, n = 100) {
  const { players } = computeRankings(rows, {
    selectedGame: "All",
    selectedMode: "All",
    yearRange: [YEAR_MIN, CURRENT_YEAR],
    lanOnly: false,
    powerRanking: false,
    pointsConfig: DEFAULT_POINTS_CONFIG,
    pointsVisibility: DEFAULT_POINTS_VISIBILITY,
    gameWeights: DEFAULT_GAME_WEIGHTS,
    gameVisibility: DEFAULT_GAME_VISIBILITY,
    tierWeights: DEFAULT_TIER_WEIGHTS,
    tierVisibility: DEFAULT_TIER_VISIBILITY,
    modeWeights: DEFAULT_MODE_WEIGHTS,
    modeVisibility: DEFAULT_MODE_VISIBILITY,
  });
  return players.slice(0, n).map((p) => p.player);
}

const FINISH = { first: "Won", second: "2nd at", top4: "Top 4 at", top8: "Top 8 at" };

// Clues in the order they unlock: one at the start, one more per wrong guess.
export function cluesFor(p) {
  const best = p.bestFinish;
  const years = p.first === p.last ? `${p.first}` : `${p.first} to ${p.last}`;
  return [
    // years alone first: it starts people thinking about an era; the main
    // game waits for clue 2, where it leads the list (Bruno, 2026-11-22)
    { key: "years", label: "Years", text: years },
    { key: "games", label: "Games", games: p.gameList, text: p.gameList.join(", ") },
    { key: "titles", label: "Titles", text: `${p.titles}` },
    { key: "lan", label: "LAN events", text: `${p.lan}` },
    { key: "best", label: "Best finish", text: best ? `${FINISH[best.bucket]} ${best.event.name} (${best.event.year})` : "none" },
    { key: "name", label: "Name", text: `${p.name[0].toUpperCase()}, ${p.name.length} letters` },
  ];
}

export const MAX_GUESSES = 6;

// "up" = the answer's value is higher than the guess's
const dir = (answer, guess) => (answer === guess ? "same" : answer > guess ? "up" : "down");

// A guess against the answer, on facts a fan reads at a glance.
export function compareGuess(guess, answer) {
  return {
    game: guess.mainGame === answer.mainGame,
    first: dir(answer.first, guess.first),
    titles: dir(answer.titles, guess.titles),
    lan: dir(answer.lan, guess.lan),
  };
}
