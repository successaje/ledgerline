// Rasterises the brand SVGs into the PNG sizes the app, stores and social cards need.
const sharp = require("sharp");
const fs = require("node:fs");
const path = require("node:path");
const src = path.join(__dirname, "..", "brand");
const out = path.join(__dirname, "..", "public", "brand");
fs.mkdirSync(out, { recursive: true });
const jobs = [
  ["mark.svg", "ledgerline-mark-512.png", 512, 512],
  ["mark.svg", "ledgerline-mark-192.png", 192, 192],
  ["mark.svg", "ledgerline-mark-180.png", 180, 180],
  ["mark.svg", "ledgerline-mark-64.png", 64, 64],
  ["mark.svg", "ledgerline-mark-32.png", 32, 32],
  ["wordmark.svg", "ledgerline-wordmark.png", 1168, 256],
  ["wordmark-dark.svg", "ledgerline-wordmark-dark.png", 1168, 256],
  ["og.svg", "ledgerline-og.png", 1200, 630],
  ["dueprocess-mark.svg", "dueprocess-mark-512.png", 512, 512],
  ["dueprocess-wordmark.svg", "dueprocess-wordmark.png", 1352, 256],
  ["dueprocess-og.svg", "dueprocess-og.png", 1200, 630],
];
(async () => {
  for (const [from, to, w, h] of jobs) {
    await sharp(path.join(src, from), { density: 384 }).resize(w, h).png().toFile(path.join(out, to));
    console.log("wrote", to);
  }
  for (const f of fs.readdirSync(src)) fs.copyFileSync(path.join(src, f), path.join(out, f));
})();
