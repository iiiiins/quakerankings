import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { Container, Paper, Typography } from "@mui/material";
import useTournaments from "../hooks/useTournaments";
import computeRankings from "../lib/computeRankings";
import groupEvents from "../lib/groupEvents";
import computeRecords, {
  MIN_GRAND_FINALS,
  LEADER_CAP,
} from "../lib/computeRecords";
import gameLogos from "../lib/gameLogos";
import { CURRENT_YEAR, YEAR_MIN } from "../lib/formulaDefaults";

// "/records" route. All-time records that RECOMPUTE under the visitor's
// formula: the gear config arrives as props (PlayerList is the model) and a
// hidden game/tier/mode/placement doesn't count while hidden. Deliberately no
// filter bar — records take the gear config only, never the home board's
// per-page filters (Power Ranking included).

const pct = (rate) => `${Math.round(rate * 1000) / 10}%`;
const prize = (n) => `$${n.toLocaleString("en-US")}`;

const PlayerName = ({ name }) => (
  <Link className="rec-name" to={`/players/${name}`}>
    {name}
  </Link>
);

// joined co-leader / winner name links, capped to keep team rows in check.
// The literal spaces around the separator matter: each name is nowrap, so
// they're the only soft wrap points on narrow screens.
const NameList = ({ names }) => (
  <>
    {names.slice(0, LEADER_CAP).map((name, i) => (
      <React.Fragment key={name}>
        {i > 0 && <span className="rec-sep"> · </span>}
        <PlayerName name={name} />
      </React.Fragment>
    ))}
    {names.length > LEADER_CAP && (
      <>
        {" "}
        <span className="rec-more" title={names.join(", ")}>
          +{names.length - LEADER_CAP}
        </span>
      </>
    )}
  </>
);

const RecordCard = ({ title, note, wide, children }) => (
  <Paper elevation={0} className={`game-section${wide ? " rec-wide" : ""}`}>
    <div className="game-section-head">
      <Typography component="h3" className="game-section-title">
        {title}
      </Typography>
      {note && <span className="rec-note">{note}</span>}
    </div>
    {children}
  </Paper>
);

// standard player-record list: rank / name / context / value
const RecordRows = ({ rows, sub, value, unit, empty }) =>
  rows.length === 0 ? (
    <div className="rec-empty">{empty || "No results under this formula"}</div>
  ) : (
    <div className="rec-list">
      {rows.map((r, i) => (
        <div key={r.player} className={`rec-row${i === 0 ? " lead" : ""}`}>
          <span className="rec-rank">{String(i + 1).padStart(2, "0")}</span>
          <PlayerName name={r.player} />
          <span className="rec-sub">{sub(r)}</span>
          <span className="rec-val">
            {value(r)}
            {unit && <i>{unit}</i>}
          </span>
        </div>
      ))}
    </div>
  );

const RecordsPage = ({
  pointsConfig,
  pointsVisibility,
  gameWeights,
  gameVisibility,
  tierWeights,
  tierVisibility,
  modeWeights,
  modeVisibility,
  minEventsForPpe,
}) => {
  const tournamentList = useTournaments();

  const records = useMemo(() => {
    // neutral filters: records run over the full dataset; only the gear
    // (weights + visibility) shapes them
    const { players } = computeRankings(tournamentList, {
      selectedGame: "All",
      selectedMode: "All",
      yearRange: [YEAR_MIN, CURRENT_YEAR],
      lanOnly: false,
      powerRanking: false,
      pointsConfig,
      pointsVisibility,
      gameWeights,
      gameVisibility,
      tierWeights,
      tierVisibility,
      modeWeights,
      modeVisibility,
      minEventsForPpe,
    });
    return computeRecords(players, groupEvents(tournamentList), {
      pointsVisibility,
      gameVisibility,
      tierVisibility,
      modeVisibility,
    });
  }, [
    tournamentList,
    pointsConfig,
    pointsVisibility,
    gameWeights,
    gameVisibility,
    tierWeights,
    tierVisibility,
    modeWeights,
    modeVisibility,
    minEventsForPpe,
  ]);

  const {
    mostTitles,
    titlesByGame,
    tier1Titles,
    gfConversion,
    careerSpans,
    mostEvents,
    prizeEvents,
  } = records;

  return (
    <Container disableGutters maxWidth={false}>
      <div className="rec-page">
        <h2 className="method-title">Records</h2>
        <p className="method-lede">
          All-time records under <b>your</b> formula — open the settings gear,
          reweight or hide anything, and every record recomputes. A hidden
          game's titles don't count while it's hidden.
        </p>

        <div className="rec-grid">
          <RecordCard title="Most titles">
            <RecordRows
              rows={mostTitles}
              sub={(r) => `${r.events} events`}
              value={(r) => r.titles}
            />
          </RecordCard>

          <RecordCard title="Titles by game" note="leader per game">
            <div className="rec-list">
              {titlesByGame.map((r) => (
                <div key={r.game} className="rec-row">
                  <img
                    className="rec-glogo"
                    src={gameLogos[r.game]}
                    alt={r.game}
                    title={r.game}
                  />
                  <span className="rec-main">
                    <span className="rec-names">
                      {r.leaders.length === 0 ? (
                        <span className="ppe-dash">—</span>
                      ) : (
                        <NameList names={r.leaders} />
                      )}
                    </span>
                    <span className="rec-gsub">{r.game}</span>
                  </span>
                  <span className="rec-val">
                    {r.titles > 0 ? r.titles : <span className="ppe-dash">—</span>}
                  </span>
                </div>
              ))}
            </div>
          </RecordCard>

          <RecordCard title="Tier-1 titles" note="majors only">
            <RecordRows
              rows={tier1Titles}
              sub={(r) => `of ${r.allTitles} titles`}
              value={(r) => r.titles}
            />
          </RecordCard>

          <RecordCard
            title="Grand-final conversion"
            note={`min ${MIN_GRAND_FINALS} grand finals`}
          >
            {gfConversion === null ? (
              <div className="rec-empty">
                Needs both 1st and 2nd place visible in your formula
              </div>
            ) : (
              <RecordRows
                rows={gfConversion}
                sub={(r) => `won ${r.won} of ${r.finals}`}
                value={(r) => pct(r.rate)}
              />
            )}
          </RecordCard>

          <RecordCard title="Longest career span">
            <RecordRows
              rows={careerSpans}
              sub={(r) => `${r.from} → ${r.to}`}
              value={(r) => r.years}
              unit="YRS"
            />
          </RecordCard>

          <RecordCard title="Most events attended">
            <RecordRows
              rows={mostEvents}
              sub={(r) => `${r.from} → ${r.to}`}
              value={(r) => r.events}
            />
          </RecordCard>

          <RecordCard
            title="Biggest prize pools won"
            note="context, not score"
            wide
          >
            {prizeEvents.length === 0 ? (
              <div className="rec-empty">No results under this formula</div>
            ) : (
              <div className="rec-list">
                {prizeEvents.map((e, i) => (
                  <div
                    key={`${e.name}|${e.year}|${e.game}|${e.mode}`}
                    className={`rec-row${i === 0 ? " lead" : ""}`}
                  >
                    <span className="rec-rank">{String(i + 1).padStart(2, "0")}</span>
                    <img
                      className="rec-glogo"
                      src={gameLogos[e.game]}
                      alt={e.game}
                      title={e.game}
                    />
                    <span className="rec-main">
                      <span className="rec-event">{e.name}</span>
                      <span className="rec-gsub">
                        {e.year} · {e.mode} · won by{" "}
                        <NameList names={e.winners} />
                      </span>
                    </span>
                    <span className="rec-val rec-prize">{prize(e.prizepool)}</span>
                  </div>
                ))}
              </div>
            )}
          </RecordCard>
        </div>
      </div>
    </Container>
  );
};

export default RecordsPage;
