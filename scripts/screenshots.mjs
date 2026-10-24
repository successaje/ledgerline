// Screenshots of the main screens at the blueprint widths, plus a rough Web Vitals read per page.
// Usage: node scripts/screenshots.mjs [baseUrl]   (default http://localhost:3000; use a production build for vitals)
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE = process.argv[2] || "http://localhost:3000";
const OUT = path.resolve("docs/screenshots");
fs.mkdirSync(OUT, { recursive: true });
const WIDTHS = [320, 375, 768, 1440];

// Employer request and share link with placeholder ids: the pages render their layout; chain checks come back Unavailable.
const b64 = s => Buffer.from(s).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const uid = "0x" + "ab".repeat(32);
const employerReq = b64(JSON.stringify({ worker: "0x" + "11".repeat(20), workerName: "Maria", employerLabel: "Mdm Tan", items: [{ uid, period: 202607, amountCents: 50000, status: 3, expectedCents: 70000, respondBy: Date.now() + 2 * 86400000 }] }));
const bundle = b64(JSON.stringify({ v: 1, worker: { address: "0x" + "11".repeat(20), name: "Maria" }, employer: { label: "Mdm Tan", id: "0x" + "22".repeat(32) }, bankAttestor: "0x" + "33".repeat(20), issuedAt: Date.now(), responseWindowDays: 3, items: [{ period: 202607, amountCents: 50000, status: 3, expectedCents: 70000, payEventUID: uid }] }));

const PAGES = [
  { name: "landing", url: "/" },
  { name: "start", url: "/app/start", fresh: true },
  { name: "home", url: "/app" },
  { name: "records", url: "/app/records" },
  { name: "record-detail", url: "/app/records/202607" },
  { name: "record-flow-review", url: "/app/record?period=202610", steps: 3 },
  { name: "share", url: "/app/share" },
  { name: "settings", url: "/app/settings" },
  { name: "employer", url: "/employer?c=" + employerReq },
  { name: "verify", url: "/verify?b=" + bundle },
];

const VITALS_SNIPPET = `
  window.__v = { lcp: 0, cls: 0, fcp: 0 };
  new PerformanceObserver(l => { for (const e of l.getEntries()) window.__v.lcp = e.startTime; }).observe({ type: "largest-contentful-paint", buffered: true });
  new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__v.cls += e.value; }).observe({ type: "layout-shift", buffered: true });
  new PerformanceObserver(l => { for (const e of l.getEntries()) if (e.name === "first-contentful-paint") window.__v.fcp = e.startTime; }).observe({ type: "paint", buffered: true });
`;

const browser = await chromium.launch({ headless: true });
const vitals = [];
for (const width of WIDTHS) {
  const context = await browser.newContext({ viewport: { width, height: width < 768 ? 812 : 900 }, deviceScaleFactor: 1, locale: "en-SG", reducedMotion: "reduce" });
  await context.addInitScript(VITALS_SNIPPET);
  const page = await context.newPage();
  // Seed the sample ledger once per context so app pages have content.
  await page.goto(BASE + "/app?sample=1", { waitUntil: "networkidle" });
  await page.waitForURL("**/app", { timeout: 15000 }).catch(() => {});
  for (const p of PAGES) {
    if (p.fresh) await page.evaluate(() => localStorage.removeItem("ll.ledger.v1"));
    await page.goto(BASE + p.url, { waitUntil: "networkidle" });
    if (p.steps) for (let i = 0; i < p.steps; i++) { await page.getByRole("button", { name: "Continue" }).click(); await page.waitForTimeout(150); }
    await page.waitForTimeout(400);
    const v = await page.evaluate(() => {
      const nav = performance.getEntriesByType("navigation")[0];
      return { ...window.__v, ttfb: nav ? nav.responseStart : 0, scrollW: document.documentElement.scrollWidth, innerW: window.innerWidth };
    });
    vitals.push({ page: p.name, width, lcp: Math.round(v.lcp), fcp: Math.round(v.fcp), cls: Number(v.cls.toFixed(3)), ttfb: Math.round(v.ttfb), overflow: v.scrollW > v.innerW ? `${v.scrollW}>${v.innerW}` : "" });
    await page.screenshot({ path: path.join(OUT, `${p.name}-${width}.png`), fullPage: true });
    if (p.fresh) { await page.goto(BASE + "/app?sample=1", { waitUntil: "networkidle" }); await page.waitForURL("**/app", { timeout: 15000 }).catch(() => {}); }
  }
  await context.close();
}
await browser.close();
const lines = ["| page | width | TTFB ms | FCP ms | LCP ms | CLS | horizontal overflow |", "|---|---|---|---|---|---|---|", ...vitals.map(v => `| ${v.page} | ${v.width} | ${v.ttfb} | ${v.fcp} | ${v.lcp} | ${v.cls} | ${v.overflow || "none"} |`)];
fs.writeFileSync(path.join(OUT, "vitals.md"), `# Screens and vitals\n\nMeasured headless with Playwright/Chromium against ${BASE}, reduced motion, cold cache per width.\nLCP and CLS use PerformanceObserver; INP is not measurable headless and is not reported.\n\n${lines.join("\n")}\n`);
console.log(lines.join("\n"));
