import React from "react";
import { CircularProgress } from "@mui/material";
import { refreshTournaments } from "../hooks/useTournaments";

// Shared loading / error placeholder for pages that read the tournaments table.
const LoadState = ({ error, label = "Loading rankings…" }) =>
  error ? (
    <div className="load-state load-error" role="alert">
      <span>Couldn't load tournament data. Check your connection and try again.</span>
      <button type="button" className="plate" onClick={() => refreshTournaments()}>
        <span className="led" />
        Retry
      </button>
    </div>
  ) : (
    <div className="load-state" role="status" aria-live="polite">
      <CircularProgress size={28} thickness={4} color="primary" />
      <span>{label}</span>
      <div className="load-skeleton" aria-hidden="true">
        {Array.from({ length: 6 }, (_, i) => (
          <span key={i} className="load-skel-row" style={{ opacity: 1 - i * 0.14 }} />
        ))}
      </div>
    </div>
  );

export default LoadState;
