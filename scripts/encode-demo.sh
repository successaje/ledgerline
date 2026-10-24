#!/bin/sh
# Joins the explainer intro and the screen recording into one H.264 mp4 (served as /demo/ledgerline-demo-2.mp4),
# cutting the wait for the record index between the employer's response and its appearance on the worker's record.
# Inputs: public/demo/intro.webm (scripts/record-intro.mjs), public/demo/ledgerline-demo.webm and markers.json (scripts/record-demo.mjs).
set -e
cd "$(dirname "$0")/.."
INTRO=public/demo/intro.webm
DEMO=public/demo/ledgerline-demo.webm
OUT=public/demo/ledgerline-demo-2.mp4
ID=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$INTRO")
FADE=$(echo "$ID - 0.6" | bc)
# Cut window from the markers: 2.5 s after the employer's response is recorded, to 0.4 s before it shows on the record.
CUT=$(node -e 'const m=require("./public/demo/markers.json");const a=m.find(x=>x.name==="employer-done").t+2.5;const b=m.find(x=>x.name==="response-on-record").t-0.4;console.log(a.toFixed(1),b.toFixed(1))')
C1=$(echo "$CUT" | cut -d" " -f1); C2=$(echo "$CUT" | cut -d" " -f2)
ffmpeg -y -loglevel error -i "$INTRO" -i "$DEMO" -filter_complex \
  "[0:v]fps=25,scale=1280:720,format=yuv420p,fade=t=out:st=${FADE}:d=0.6[a];\
   [1:v]fps=25,scale=1280:720,format=yuv420p,split=2[d1][d2];\
   [d1]trim=0:${C1},setpts=PTS-STARTPTS,fade=t=in:st=0:d=0.5,fade=t=out:st=$(echo "$C1 - 0.4" | bc):d=0.4[b];\
   [d2]trim=start=${C2},setpts=PTS-STARTPTS,fade=t=in:st=0:d=0.4[c];\
   [a][b][c]concat=n=3:v=1:a=0[v]" \
  -map "[v]" -c:v libx264 -preset slow -crf 22 -pix_fmt yuv420p -movflags +faststart -an "$OUT"
echo "intro ${ID}s, cut ${C1}s-${C2}s"
ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT"
ls -la "$OUT"
