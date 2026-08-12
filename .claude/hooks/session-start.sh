#!/bin/bash
# Installs npm dependencies so lint and build work in Claude Code on the web,
# where every session starts from a fresh clone without node_modules.
set -euo pipefail

[ "${CLAUDE_CODE_REMOTE:-}" = "true" ] || exit 0
cd "${CLAUDE_PROJECT_DIR:-"$(dirname "$0")/../.."}"

# npm writes node_modules/.package-lock.json at the end of every install. Is the
# marker newer than the lockfile, the dependencies are up to date.
if [ ! -e node_modules/.package-lock.json ] || [ ! node_modules/.package-lock.json -nt package-lock.json ]; then
  # A SessionStart hook's stdout is added to the session context; npm's install
  # log belongs in the hook output instead.
  npm ci --no-audit --no-fund >&2
fi
