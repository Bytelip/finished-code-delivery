#!/usr/bin/env bash
# AgroSpace Nexus - Standalone Local Website Runner
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Ensure NodeJS is in PATH
if ! command -v npm &> /dev/null; then
  export PATH="/c/Users/naren/AppData/Local/Microsoft/WinGet/Packages/OpenJS.NodeJS.LTS_Microsoft.Winget.Source_8wekyb3d8bbwe/node-v24.20.0-win-x64:$PATH"
fi

echo "===================================================================="
echo "                  AGROSPACE NEXUS - LOCAL HOST (BASH)"
echo "===================================================================="
echo ""
echo " Starting standalone local website server via Bash..."
echo ""
echo " [OK] Local URL:   http://localhost:8080/"
echo " [OK] Network URL: http://192.168.0.3:8080/"
echo ""
echo " Press Ctrl+C to stop the server at any time."
echo "===================================================================="
echo ""

npm run start
