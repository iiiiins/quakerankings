// Persists the visitor's scoring formula (the settings-menu state) across
// visits. The key is versioned: bump it when the stored shape changes
// incompatibly and stale formulas will be ignored instead of breaking scoring.
const STORAGE_KEY = "qpr.formula.v1";

export function loadStoredFormula() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    // unreadable JSON or localStorage unavailable — fall back to defaults
    return null;
  }
}

export function saveStoredFormula(formula) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(formula));
  } catch {
    // localStorage unavailable (private mode) — the formula just won't persist
  }
}
