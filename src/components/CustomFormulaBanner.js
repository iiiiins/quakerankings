import React from "react";
import { useLocation } from "react-router-dom";
import { Button } from "@mui/material";
import TuneIcon from "@mui/icons-material/Tune";
import { encodeShareState, summarizeShareState } from "../lib/shareCodec";
import { DEFAULT_FILTERS } from "../lib/formulaDefaults";

// "You're using a custom formula" — the visitor's own counterpart to
// SharedBanner, same surface and chips. Shows on the home board whenever the
// active formula differs from the defaults (the gear state is otherwise
// invisible); filters/sort are excluded — they have visible affordances of
// their own. Detection reuses the share codec: a formula is default iff it
// encodes to bare "v1" against default filters.
const CustomFormulaBanner = ({ config, onReset }) => {
  const { pathname } = useLocation();
  const isDefault = encodeShareState(config, DEFAULT_FILTERS) === "v1";
  if (pathname !== "/" || isDefault) return null;

  const chips = summarizeShareState(config, DEFAULT_FILTERS);

  return (
    <div className="shared-banner">
      <TuneIcon className="sb-icon" />
      <div className="sb-main">
        <div className="sb-title">You're using a custom formula</div>
        <div className="share-chips">
          {chips.map((chip) => (
            <span key={chip} className="f-chip">
              {chip}
            </span>
          ))}
        </div>
      </div>
      <div className="sb-actions">
        <Button variant="outlined" size="small" onClick={onReset}>
          Reset to default
        </Button>
      </div>
    </div>
  );
};

export default CustomFormulaBanner;
