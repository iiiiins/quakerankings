import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Container, Paper, Typography, TextField, Button } from "@mui/material";
import { supabase } from "../services/supabaseClient";
import useSession from "../hooks/useSession";
import { refreshTournaments } from "../hooks/useTournaments";
import { insertTournament } from "../services/tournamentWrites";
import TournamentForm from "./TournamentForm";

// Single-user admin: login gate + data entry. Security lives entirely in RLS
// (uid-scoped write policies + signups disabled) — shipping this UI in the
// public bundle is fine by design; see docs/roadmap.md §3.
const AdminPage = () => {
  const { session, loading } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState(null);
  const [signingIn, setSigningIn] = useState(false);

  const [lastAdded, setLastAdded] = useState(null);

  const handleLogin = async (event) => {
    event.preventDefault();
    setSigningIn(true);
    setAuthError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setAuthError(error.message);
    setSigningIn(false);
  };

  const handleAdd = async (row) => {
    const { id, error } = await insertTournament(row);
    if (error) return { error };
    refreshTournaments();
    setLastAdded({ id, name: row.Event_Name, year: row.Year });
    return {};
  };

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      // A session revoked or expired elsewhere (e.g. a dashboard password
      // rotation while this tab was open) leaves signOut unable to load the
      // session — it errors without clearing the persisted token, stranding
      // the tab "signed in". Drop the token and start over signed out.
      Object.keys(localStorage)
        .filter((k) => k.startsWith("sb-") && k.endsWith("-auth-token"))
        .forEach((k) => localStorage.removeItem(k));
      window.location.reload();
    }
  };

  if (loading) return null;

  if (!session) {
    return (
      <Container disableGutters maxWidth={false}>
        <div className="admin-page">
          <h2 className="method-title">Admin</h2>
          <Paper elevation={0} className="game-section admin-login-card">
            <div className="game-section-head">
              <Typography component="h3" className="game-section-title">
                Sign in
              </Typography>
            </div>
            <form className="admin-login" onSubmit={handleLogin}>
              <span className="filter-label">Email</span>
              <TextField
                size="small"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                fullWidth
              />
              <span className="filter-label">Password</span>
              <TextField
                size="small"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                fullWidth
              />
              {authError && <div className="admin-error">{authError}</div>}
              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={signingIn || !email || !password}
              >
                Sign in
              </Button>
            </form>
          </Paper>
        </div>
      </Container>
    );
  }

  return (
    <Container disableGutters maxWidth={false}>
      <div className="admin-page">
        <div className="admin-head">
          <h2 className="method-title">Admin</h2>
          <span className="admin-user">{session.user.email}</span>
          <Button
            variant="text"
            color="primary"
            className="tab-idle"
            onClick={handleSignOut}
          >
            Sign out
          </Button>
        </div>
        {authError && <div className="admin-error">{authError}</div>}
        <Typography component="p" className="admin-hint">
          Add a tournament below. To correct or delete one, find it in the{" "}
          <Link to="/events">events browser</Link> — every row gets an edit
          control while you're signed in.
        </Typography>
        <Paper elevation={0} className="game-section">
          <div className="game-section-head">
            <Typography component="h3" className="game-section-title">
              Add tournament
            </Typography>
          </div>
          {lastAdded && (
            <div className="admin-success">
              Added #{lastAdded.id} — {lastAdded.name} ({lastAdded.year}).{" "}
              <Link to="/events">See it in the browser</Link>
            </div>
          )}
          <TournamentForm submitLabel="Add tournament" onSubmit={handleAdd} />
        </Paper>
      </div>
    </Container>
  );
};

export default AdminPage;
