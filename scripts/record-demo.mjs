// Records the product demo on the live site with a visible cursor and no captions.
// Output: public/demo/ledgerline-demo.webm (convert to mp4 with scripts/encode-demo.sh)
// Usage: node scripts/record-demo.mjs [baseUrl]
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE = process.argv[2] || "https://ledgerline-sg.vercel.app";
const OUT_DIR = path.resolve("public/demo");
fs.mkdirSync(OUT_DIR, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1, locale: "en-SG",
  recordVideo: { dir: OUT_DIR, size: { width: 1280, height: 720 } },
});
// A drawn cursor that follows the mouse, since headless recordings have none. Injected on every page.
await context.addInitScript(() => {
  const draw = () => {
    if (document.getElementById("__cur")) return;
    const c = document.createElement("div"); c.id = "__cur";
    c.innerHTML = `<svg width="26" height="30" viewBox="0 0 26 30"><path d="M3 2l18 13-8 1.5 4.5 9-3.5 1.6-4.5-9L3 24z" fill="#fff" stroke="#172C2A" stroke-width="1.6" stroke-linejoin="round"/></svg>`;
    Object.assign(c.style, { position: "fixed", left: "0px", top: "0px", zIndex: "2147483647", pointerEvents: "none", transition: "transform 40ms linear", filter: "drop-shadow(0 1px 2px rgba(0,0,0,.35))", transform: "translate(-9999px,-9999px)" });
    document.documentElement.appendChild(c);
    window.__moveCursor = (x, y) => { c.style.transform = `translate(${x - 3}px, ${y - 2}px)`; };
    window.__pressCursor = () => { c.style.scale = "0.85"; setTimeout(() => { c.style.scale = "1"; }, 140); };
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", draw); else draw();
});
const page = await context.newPage();
const sleep = ms => new Promise(r => setTimeout(r, ms));
let cur = { x: 640, y: 360 };

async function glide(x, y, ms = 650) {
  const steps = Math.max(8, Math.round(ms / 16));
  for (let i = 1; i <= steps; i++) {
    const t = i / steps, e = 1 - Math.pow(1 - t, 3);
    const nx = cur.x + (x - cur.x) * e, ny = cur.y + (y - cur.y) * e;
    await page.mouse.move(nx, ny);
    await page.evaluate(([a, b]) => window.__moveCursor?.(a, b), [nx, ny]).catch(() => {});
    await sleep(ms / steps);
  }
  cur = { x, y };
}
async function showCursor() { await page.evaluate(([a, b]) => window.__moveCursor?.(a, b), [cur.x, cur.y]).catch(() => {}); }
async function clickOn(locator, hold = 900) {
  await locator.first().scrollIntoViewIfNeeded();
  await sleep(200);
  const box = await locator.first().boundingBox();
  if (!box) throw new Error("no box for " + locator);
  await glide(box.x + Math.min(box.width / 2, 120), box.y + box.height / 2);
  await sleep(180);
  await page.evaluate(() => window.__pressCursor?.()).catch(() => {});
  await locator.first().click();
  await sleep(hold);
}
async function typeInto(locator, text) {
  await clickOn(locator, 200);
  await locator.first().fill("");
  await page.keyboard.type(text, { delay: 55 });
  await sleep(500);
}
async function goto(url, hold = 1800) {
  await page.goto(BASE + url, { waitUntil: "networkidle" });
  await showCursor();
  await sleep(hold);
}
async function scrollBy(px, ms = 700) {
  await page.mouse.wheel(0, px);
  await sleep(ms);
}
const btn = name => page.getByRole("button", { name, exact: true });
const link = name => page.getByRole("link", { name, exact: true });

try {
  // 1. Landing: what it is, then try the sample
  await goto("/", 2600);
  await scrollBy(420, 1400);
  await scrollBy(-420, 900);
  await clickOn(link("Try a sample"), 2600);
  await page.waitForURL("**/app");
  await showCursor();
  await sleep(1200);
  await scrollBy(380, 1500);
  await scrollBy(-380, 700);

  // 2. Record November as partly paid: Month → Payment → Supporting information → Review → Publish
  await clickOn(page.getByRole("link", { name: /^Record / }), 1600);
  await clickOn(btn("Continue"), 1200);
  await clickOn(page.getByText("Partly paid", { exact: true }), 900);
  await typeInto(page.getByLabel("Amount received"), "500");
  await clickOn(btn("Continue"), 1000);
  await typeInto(page.getByLabel("Note"), "Paid on the 12th. S$200 held back, no reason given.");
  await clickOn(btn("Continue"), 1600);
  await scrollBy(520, 1600);
  await clickOn(page.getByRole("checkbox"), 900);
  await clickOn(btn("Publish test record"), 1200);
  await page.getByRole("heading", { name: /recorded$/ }).waitFor({ timeout: 180000 });
  await showCursor();
  await sleep(2200);
  await clickOn(link("View record"), 2200);
  await page.waitForURL("**/app/records/*");
  await showCursor();
  await sleep(600);

  // 3. Ask the employer, open the link as the employer, acknowledge
  await clickOn(btn("Ask employer to respond"), 1800);
  const employerUrl = await page.getByRole("link", { name: "Open as the employer" }).getAttribute("href");
  await page.keyboard.press("Escape");
  await sleep(500);
  await page.goto(employerUrl, { waitUntil: "networkidle" });
  await showCursor();
  await sleep(2400);
  await clickOn(btn("Acknowledge"), 1800);
  await clickOn(btn("Yes, acknowledge"), 1000);
  await page.getByText("Your signed response on the test network").waitFor({ timeout: 180000 });
  await showCursor();
  await sleep(2400);

  // 4. Back as the worker: the response arrives, then share the month
  await goto("/app/records", 1600);
  const period = (await page.evaluate(() => { const l = JSON.parse(localStorage.getItem("ll.ledger.v1")); return Math.max(...l.records.filter(r => r.payEventUID).map(r => r.period)); }));
  for (let i = 0; i < 8; i++) {
    await page.goto(BASE + `/app/records/${period}`, { waitUntil: "networkidle" });
    if (await page.getByText("Employer acknowledged").isVisible().catch(() => false)) break;
    await sleep(8000);
  }
  await showCursor();
  await sleep(1400);
  await scrollBy(340, 2600);
  await scrollBy(-340, 700);
  await clickOn(link("Share"), 1800);
  await page.waitForURL("**/app/share*");
  await showCursor();
  await sleep(800);
  await clickOn(btn("Create bundle for 1 month"), 1800);
  const verifyUrl = await page.getByRole("link", { name: "Open the verifier" }).getAttribute("href");
  await page.keyboard.press("Escape");
  await sleep(400);

  // 5. The verifier, as a mediator would see it
  await page.goto(verifyUrl, { waitUntil: "networkidle" });
  await showCursor();
  await page.getByText("What was checked").waitFor({ timeout: 120000 });
  await sleep(1200);
  await scrollBy(300, 2600);
  await scrollBy(300, 2200);

  // 6. Close on the landing page
  await goto("/", 2600);
} catch (e) {
  console.error("demo failed:", e);
}

const video = page.video();
await context.close();
await browser.close();
const raw = await video.path();
const final = path.join(OUT_DIR, "ledgerline-demo.webm");
fs.renameSync(raw, final);
console.log("video:", final);
