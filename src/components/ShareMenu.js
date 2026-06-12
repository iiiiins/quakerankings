import React, { useRef, useState } from "react";
import { Button, Typography } from "@mui/material";
import { encodeShareState, summarizeShareState } from "../lib/shareCodec";

// Content of the header share popover: the share link for the current
// formula + home filters, with the customization chips. The link is built
// on demand from live state — the address bar is never rewritten.
const ShareMenu = ({ config, filters }) => {
  const inputRef = useRef(null);
  const [copyState, setCopyState] = useState(null); // null | "copied" | "manual"

  const link = `${window.location.origin}${window.location.pathname}#/?f=${encodeShareState(
    config,
    filters
  )}`;
  const chips = summarizeShareState(config, filters);

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
    </div>
  );
};

export default ShareMenu;
