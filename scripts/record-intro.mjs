// Renders the explainer animation (scripts/intro/intro.html) to public/demo/intro.webm. Duration: 41 s.
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
const OUT_DIR = path.resolve("public/demo");
const DURATION_MS = 41_000;
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1, recordVideo: { dir: OUT_DIR, size: { width: 1280, height: 720 } } });
const page = await context.newPage();
await page.goto("file://" + path.resolve("scripts/intro/intro.html"));
await page.waitForTimeout(DURATION_MS);
const video = page.video();
await context.close();
await browser.close();
const final = path.join(OUT_DIR, "intro.webm");
fs.renameSync(await video.path(), final);
console.log("intro:", final);
