#!/bin/bash
# Installs npm dependencies so lint and build work in Claude Code on the web,
# where every session starts from a fresh clone without node_modules.
set -euo pipefail

[ "${CLAUDE_CODE_REMOTE:-}" = "true" ] || exit 0
cd "${CLAUDE_PROJECT_DIR:-"$(dirname "$0")/../.."}"

# npm writes node_modules/.package-lock.json at the end of every install. Is the
# marker newer than both manifests, the dependencies are up to date. package.json
# is checked too: on its own it means the two have drifted apart, which npm ci
# refuses to install — better to surface that here than at the first build.
if [ ! -e node_modules/.package-lock.json ] \
  || [ ! node_modules/.package-lock.json -nt package-lock.json ] \
  || [ ! node_modules/.package-lock.json -nt package.json ]; then
  # A SessionStart hook's stdout is added to the session context, so npm's
  # progress line goes to stderr and the success path stays silent.
  if ! npm ci --no-audit --no-fund >&2; then
    # A hook that exits 0 has its stderr sent to the debug log only, and any
    # other non-zero code surfaces just the first line of it — whichever line
    # npm happened to print first, not the one that explains the failure.
    # SessionStart cannot block, so exit 2 is the one code that shows this to
    # the user; the copy on stdout is what tells the agent.
    failed="session-start hook: npm ci failed, dependencies are NOT installed. Run 'npm ci' before lint or build."
    echo "$failed"
    echo "$failed" >&2
    exit 2
  fi
fi
