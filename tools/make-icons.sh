#!/bin/sh
# Regenerates icons/icon-{180,192,512}.png from tools/icon.html using headless Edge.
# Run in Git Bash from the project folder: sh tools/make-icons.sh
# Edge has a minimum window size, so every size renders a 512 window and scales it.
EDGE="/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
ROOT="$(cd "$(dirname "$0")/.." && pwd -W)"
SRC="file:///$(echo "$ROOT" | sed 's/ /%20/g')/tools/icon.html"
for s in 180 192 512; do
  dsf=$(node -e "console.log($s/512)")
  "$EDGE" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor="$dsf" \
    --window-size=512,512 --screenshot="$ROOT/icons/icon-$s.png" "$SRC"
done
