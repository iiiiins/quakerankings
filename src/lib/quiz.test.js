import groupEvents from "./groupEvents";
import { buildProfiles, topPool, cluesFor, compareGuess } from "./quiz";

let id = 1;
const row = (name, year, tier, game, lan, places, prize = null) => {
  const r = { id: id++, Event_Name: name, Year: year, Game: game, Mode: "Duel", Tier: tier, LAN: lan, Prizepool: prize };
  places.forEach((p, i) => (r[["1st", "2nd", "3rd", "4th"][i]] = p));
  return r;
};

const rows = [
  row("Small Cup", 2001, 4, "Quake 3", false, ["ace", "bob"]),
  row("Big Cup", 2003, 1, "Quake 3", true, ["ace", "bob"], 5000),
  row("Bigger Cup", 2003, 1, "Quake Live", true, ["ace", "cat"], 9000),
  row("Late Cup", 2009, 3, "Quake Live", false, ["cat", "dan"]),
  row("Old Cup", 1999, 5, "Quake World", false, ["dan"]),
];
const profiles = buildProfiles(groupEvents(rows));

test("a profile sums the career", () => {
  const ace = profiles.get("ace");
  expect([ace.first, ace.last, ace.events, ace.titles, ace.lan]).toEqual([2001, 2003, 3, 3, 2]);
  expect(ace.gameList).toEqual(["Quake 3", "Quake Live"]); // 2 results, then 1
  expect(ace.bestFinish.event.name).toBe("Bigger Cup"); // tier 1, bigger prize
});

test("clue 1 is years and main game, clue 2 every game with the main one first", () => {
  const c = cluesFor(profiles.get("dan"));
  expect(c.map((x) => x.key)).toEqual(["career", "games", "titles", "lan", "best", "name"]);
  // dan: 1 Quake World, 1 Quake Live; a tie goes to the older game
  expect(c[0].text).toBe("1999 to 2009 · Quake World");
  expect(c[1].games).toEqual(["Quake World", "Quake Live"]);
  expect(c.slice(2).map((x) => x.text)).toEqual(["1", "0", "2nd at Late Cup (2009)", "D, 3 letters"]);
});

test("a big-event top finish beats a small-event win for Best finish", () => {
  const cat = profiles.get("cat"); // 2nd at tier 1, won at tier 3
  expect(cluesFor(cat).find((c) => c.key === "best").text).toBe("2nd at Bigger Cup (2003)");
});

test("the answers are the top of the default board, in rank order", () => {
  expect(topPool(rows, 2)).toEqual(["ace", "cat"]); // cat 50 + 35 = 85, bob 10 + 50 = 60
  expect(topPool(rows, 100)).toHaveLength(4); // ace, cat, bob, dan
});

test("a guess is compared with the answer on game, start, titles and LAN", () => {
  expect(compareGuess(profiles.get("cat"), profiles.get("ace"))).toEqual({
    game: false, // cat's main game is Quake Live (2 results)
    first: "down", // ace started 2001, cat 2003
    titles: "up", // ace 3, cat 1
    lan: "up", // ace 2, cat 1
  });
  expect(compareGuess(profiles.get("bob"), profiles.get("ace"))).toEqual({
    game: true,
    first: "same",
    titles: "up",
    lan: "up", // ace 2 LAN events, bob 1
  });
});
