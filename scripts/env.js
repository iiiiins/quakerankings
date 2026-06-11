// Shared env loader for the admin/probe scripts: .env.local first (secrets,
// wins), then .env (public config) — the same files CRA uses.
const fs = require("fs");
const path = require("path");

function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    const p = path.join(__dirname, "..", file);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (m && !(m[1] in process.env)) process.env[m[1]] = m[2];
    }
  }
  return process.env;
}

module.exports = { loadEnv };
