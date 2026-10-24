// Records the product demo on the live site with on-screen captions. Output: public/demo/ledgerline-demo.webm
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
const page = await context.newPage();
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function caption(text, hold = 3200) {
  await page.evaluate(t => {
    let el = document.getElementById("__cap");
    if (!el) {
      el = document.createElement("div"); el.id = "__cap";
      Object.assign(el.style, { position: "fixed", left: "50%", bottom: "28px", transform: "translateX(-50%)", maxWidth: "900px", padding: "14px 22px", borderRadius: "14px", background: "rgba(23,25,28,.92)", color: "#f7f5f0", font: "600 22px/1.35 -apple-system, Inter, Segoe UI, Helvetica, Arial, sans-serif", textAlign: "center", zIndex: "99999", boxShadow: "0 8px 24px rgba(0,0,0,.25)", transition: "opacity .25s" });
      document.body.appendChild(el);
    }
    el.textContent = t; el.style.opacity = "1";
  }, text);
  await sleep(hold);
}
async function clearCaption() { await page.evaluate(() => { const el = document.getElementById("__cap"); if (el) el.style.opacity = "0"; }); }
async function click(name, opts = {}) { await page.getByRole("button", { name, ...opts }).first().click(); }

try {
  // 1. Landing
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await caption("Singapore's 300,000 domestic workers are excluded from the itemised-payslip rule. When pay goes missing, there is no evidence.", 4200);
  await caption("Ledgerline: the payslip the employer cannot take back.", 2600);

  // 2. Sample record
  await page.goto(BASE + "/app?sample=1", { waitUntil: "networkidle" });
  await page.waitForSelector("#month-202607", { timeout: 20000 });
  await caption("A sample record: Maria, nine months at S$600. July is missing. Every month she signs is written to Base; she never sees a wallet.", 4200);

  // 3. Record July (unpaid) with real stages
  await page.locator("#month-202607 .row").click();
  await caption("She records July as not paid. The record is signed by a key on her phone; a relayer pays the fee.", 2400);
  await page.locator("#month-202607").getByRole("button", { name: "Sign and record" }).click();
  await page.locator("#month-202607 .pill-ok").waitFor({ timeout: 90000 });
  await caption("Recorded on chain. The month is now hers: no employer or agency can rewrite it.", 2800);

  // 4. Record September (paid) so the employer has something to confirm
  await page.locator("#month-202609 .row").click();
  await page.locator("#month-202609").getByRole("button", { name: "Sign and record" }).click();
  await page.locator("#month-202609 .pill-ok").waitFor({ timeout: 90000 });

  // 5. Ask employer
  await click("Ask employer to confirm");
  await page.getByText("Open as the employer").waitFor({ timeout: 10000 });
  await caption("She sends her employer a WhatsApp link. No app, no account: one tap per month.", 3600);
  const empHref = await page.getByRole("link", { name: "Open as the employer" }).getAttribute("href");
  await page.keyboard.press("Escape");

  // 6. Employer confirms September, leaves July unanswered
  await page.goto(empHref, { waitUntil: "networkidle" });
  await caption("The employer's view. They confirm September and say nothing about July.", 3200);
  const sepRow = page.locator(".ledger > div", { hasText: "Sep 2026" });
  await sepRow.getByRole("button", { name: "Confirm" }).click();
  await sepRow.getByText("Confirmed").waitFor({ timeout: 90000 });
  await caption("Their answer is signed from their own phone and recorded next to her month.", 2800);

  // 7. Back to the worker: confirmations arrive, July silent
  await page.goto(BASE + "/app", { waitUntil: "networkidle" });
  await page.waitForSelector("#month-202607", { timeout: 20000 });
  // The public indexer lags the chain by a few seconds; poll until September shows the employer's answer.
  for (let i = 0; i < 12; i++) {
    if (await page.locator("#month-202609", { hasText: "employer confirmed" }).count()) break;
    await sleep(6000);
    await click("Check for confirmations");
    await sleep(2500);
  }
  await click("Settings");
  await page.getByLabel("Demo: treat the employer window as elapsed").check();
  await page.keyboard.press("Escape");
  await sleep(600);
  await caption("September: employer confirmed. July: the employer did not answer within three days. Silence is recorded as evidence.", 4200);

  // 8. Bank proof for July
  await page.locator("#month-202607 .row").click().catch(() => {});
  if (!(await page.locator("#month-202607 .row-detail").count())) await page.locator("#month-202607 .row").click();
  await caption("Now the proof. She proves from her own bank statement that no salary-sized credit arrived in the pay window.", 3200);
  await page.locator("#month-202607").getByRole("button", { name: "Prove from my bank" }).click();
  await page.locator("#month-202607 .proof-body").waitFor({ timeout: 90000 });
  await caption("\"No credit of S$600 or more from the employer between 1 and 10 July.\" Her balance never appears.", 4200);

  // 9. Bundle and verifier
  await click("Build dispute bundle");
  await page.getByRole("button", { name: /Create bundle/ }).click();
  await page.getByText("Open the verifier").waitFor({ timeout: 10000 });
  await caption("She chooses what to disclose: only July. The bundle is a link and a QR.", 3000);
  const verHref = await page.getByRole("link", { name: "Open the verifier" }).getAttribute("href");
  await page.keyboard.press("Escape");
  await page.goto(verHref, { waitUntil: "networkidle" });
  // Wait until every check has resolved (the page re-checks on its own while the index catches up).
  for (let i = 0; i < 12; i++) {
    await page.locator(".summary").first().waitFor({ timeout: 90000 });
    const pending = await page.locator(".check .mark.wait").count();
    const warn = await page.getByText("not indexed yet").count();
    if (!pending && !warn) break;
    await sleep(8000);
  }
  await caption("A mediator opens the verifier. It re-checks every signature and proof against the chain and writes one sentence.", 4600);
  await caption("Anyone can verify this. Nobody has to trust Ledgerline.", 2800);

  // 10. Languages and recovery
  await page.goto(BASE + "/app", { waitUntil: "networkidle" });
  await page.waitForSelector(".lang-select", { timeout: 20000 });
  await page.selectOption(".lang-select", "tl");
  await caption("In Tagalog, Bahasa Indonesia, Burmese and Bengali. Recovery words restore the record on a new phone.", 4200);
  await page.selectOption(".lang-select", "en");

  // 11. Close
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await caption("ledgerline-sg.vercel.app · github.com/successaje/ledgerline · Base Sepolia, testnet only", 4200);
  await clearCaption();
} catch (e) {
  console.error("demo failed:", e);
  await caption("Recording stopped: " + (e?.message || e), 2000).catch(() => {});
}

const video = page.video();
await context.close();
await browser.close();
const raw = await video.path();
const final = path.join(OUT_DIR, "ledgerline-demo.webm");
fs.renameSync(raw, final);
console.log("video:", final);
