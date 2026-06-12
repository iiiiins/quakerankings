import React from "react";
import { useLocation } from "react-router-dom";
import { Button } from "@mui/material";
import LinkIcon from "@mui/icons-material/Link";
import { summarizeShareState } from "../lib/shareCodec";

// "You're viewing a shared custom ranking" — shown on the home board while a
// share link's formula is active. Chips describe what the LINK specified
// (stable even if the visitor tweaks the gear while viewing); the live state
// is visible in the controls themselves.
const SharedBanner = ({ shared, onAdopt, onReset }) => {
  const { pathname } = useLocation();
  if (pathname !== "/") return null;

  const chips = summarizeShareState(shared.config, shared.filters);

  return (
    <div className="shared-banner">
      <LinkIcon className="sb-icon" />
      <div className="sb-main">
        <div className="sb-title">You're viewing a shared custom ranking</div>
        <div className="share-chips">
          {chips.map((chip) => (
            <span key={chip} className="f-chip">
              {chip}
            </span>
          ))}
        </div>
      </div>
      <div className="sb-actions">
        <Button variant="contained" color="primary" size="small" onClick={onAdopt}>
          Keep this formula
        </Button>
        <Button variant="outlined" size="small" onClick={onReset}>
          Reset to default
        </Button>
      </div>
    </div>
  );
};

export default SharedBanner;
