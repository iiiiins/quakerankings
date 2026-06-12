import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button, Divider, Typography } from "@mui/material";
import useTournaments from "../hooks/useTournaments";
import computeRankings from "../lib/computeRankings";
import { encodeShareState, summarizeShareState } from "../lib/shareCodec";
import renderShareCard from "../lib/renderShareCard";

// Content of the header share popover: the share link for the current
// formula + home filters, the customization chips, and the top-10 card
// (canvas PNG — download / clipboard). The link is built on demand from live
// state; the address bar is never rewritten. The top-10 is recomputed here
// through the same pure pipeline the board uses, so card and board can't
// disagree.
const ShareMenu = ({ config, filters }) => {
  const inputRef = useRef(null);
  const cardCanvasRef = useRef(null);
  const [copyState, setCopyState] = useState(null); // null | "copied" | "manual"
  const [cardUrl, setCardUrl] = useState(null);
  const [cardMsg, setCardMsg] = useState(null); // null | "copied" | error text

  const link = `${window.location.origin}${window.location.pathname}#/?f=${encodeShareState(
    config,
    filters
  )}`;
  const chips = useMemo(() => summarizeShareState(config, filters), [config, filters]);

  const tournaments = useTournaments();
  const { players, filteredCount, totalTournaments } = useMemo(
    () => computeRankings(tournaments, { ...filters, ...config }),
    [tournaments, filters, config]
  );
  const countsLine = `${players.length.toLocaleString("en-US")} players · ${(
    totalTournaments - filteredCount
  ).toLocaleString("en-US")} tournaments scored`;

  useEffect(() => {
    if (!players.length) {
      setCardUrl(null);
      return undefined;
    }
    let alive = true;
    renderShareCard({ players, chips, countsLine }).then((canvas) => {
      if (!alive) return;
      cardCanvasRef.current = canvas;
      setCardUrl(canvas.toDataURL("image/png"));
    });
    return () => {
      alive = false;
    };
  }, [players, chips, countsLine]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopyState("copied");
    } catch {
      // clipboard unavailable — select the text so Ctrl+C works
      inputRef.current?.select();
      setCopyState("manual");
    }
    setTimeout(() => setCopyState(null), 2000);
  };

  const cardBlob = () =>
    new Promise((resolve) => cardCanvasRef.current?.toBlob(resolve, "image/png"));

  const handleDownload = async () => {
    const blob = await cardBlob();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "quake-rankings-top10.png";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyImage = async () => {
    try {
      const blob = await cardBlob();
      await navigator.clipboard.write([new window.ClipboardItem({ "image/png": blob })]);
      setCardMsg("copied");
    } catch {
      setCardMsg("Image copy not supported here — use Download.");
    }
    setTimeout(() => setCardMsg(null), 2500);
  };

  return (
    <div className="share-box">
      <Typography variant="h6" gutterBottom>
        Share this ranking
      </Typography>
      <div className="share-linkrow">
        <input
          ref={inputRef}
          className="share-link"
          readOnly
          value={link}
          onFocus={(e) => e.target.select()}
          aria-label="Share link"
        />
        <Button variant="outlined" size="small" onClick={handleCopy}>
          {copyState === "copied" ? "Copied ✓" : "Copy"}
        </Button>
      </div>
      {copyState === "manual" && (
        <p className="share-note">Copy blocked by the browser — press Ctrl+C.</p>
      )}
      <div className="share-chips">
        {chips.map((chip) => (
          <span key={chip} className="f-chip">
            {chip}
          </span>
        ))}
      </div>
      <p className="share-note">
        The whole formula — points, weights, filters — lives in this link.
        Nothing is stored on a server.
      </p>

      <Divider style={{ margin: "12px 0" }} />
      <Typography variant="h6" gutterBottom>
        Top-10 card
      </Typography>
      {players.length ? (
        <>
          {cardUrl ? (
            <img className="share-card-preview" src={cardUrl} alt="Top-10 share card preview" />
          ) : (
            <div className="share-card-loading">Rendering…</div>
          )}
          <div className="share-card-actions">
            <Button variant="outlined" size="small" onClick={handleDownload} disabled={!cardUrl}>
              Download PNG
            </Button>
            <Button variant="outlined" size="small" onClick={handleCopyImage} disabled={!cardUrl}>
              {cardMsg === "copied" ? "Copied ✓" : "Copy image"}
            </Button>
          </div>
          {cardMsg && cardMsg !== "copied" && <p className="share-note">{cardMsg}</p>}
          <p className="share-note">
            Paste it next to the link — chat previews can't see the formula.
          </p>
        </>
      ) : (
        <p className="share-note">This formula scores no players — nothing to put on a card.</p>
      )}
    </div>
  );
};

export default ShareMenu;
