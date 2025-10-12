set -euo pipefail

pnpm install --recursive

pnpm --filter proto run generate || true

pnpm --filter @project-pluto/server exec playwright install chromium || true

pnpm --filter @project-pluto/server add -D @types/node@latest

pnpm --filter @project-pluto/web add -D @types/node@latest

( cd apps/server && pnpm dev ) &
SERVER_PID=$!

( cd apps/web && pnpm dev ) &
WEB_PID=$!

trap "kill $SERVER_PID $WEB_PID" EXIT
wait
