#!/usr/bin/env bash
# AgroSpace Nexus - Standalone Web Host Runner (with Cloudflare Public Tunnel)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if ! command -v npm &> /dev/null; then
  export PATH="/c/Users/naren/AppData/Local/Microsoft/WinGet/Packages/OpenJS.NodeJS.LTS_Microsoft.Winget.Source_8wekyb3d8bbwe/node-v24.20.0-win-x64:$PATH"
fi

echo "===================================================================="
echo "          AGROSPACE NEXUS - PUBLIC WEB & LOCAL HOST"
echo "===================================================================="
echo ""
echo " 1. Starting local application server..."
npm run start &
SERVER_PID=$!

echo " 2. Launching Cloudflare public web tunnel..."
./cloudflared.exe tunnel --url http://localhost:8080 &
TUNNEL_PID=$!

trap "kill $SERVER_PID $TUNNEL_PID 2>/dev/null || true; exit 0" INT TERM

echo ""
echo " Both servers are running. Check tunnel output above for the public web URL."
echo " Press Ctrl+C to terminate both servers."
echo "===================================================================="

wait
