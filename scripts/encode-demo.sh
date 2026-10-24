#!/bin/sh
# Converts the Playwright recording to an H.264 mp4 that browsers and DoraHacks can play.
set -e
cd "$(dirname "$0")/.."
ffmpeg -y -loglevel error -i public/demo/ledgerline-demo.webm -c:v libx264 -preset slow -crf 23 -pix_fmt yuv420p -movflags +faststart -an public/demo/ledgerline-demo-2.mp4
ls -la public/demo/ledgerline-demo-2.mp4
