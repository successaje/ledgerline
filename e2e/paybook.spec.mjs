// Worker flows that do not publish anything: onboarding with backup check, drafts, filters, correction warning,
// restore conflict, share selection, employer page states. Nothing here sends a transaction.
import { test, expect } from "playwright/test";

const fresh = async page => { await page.goto("/"); await page.evaluate(() => ["ll.ledger.v1", "ll.key.worker", "ll.phrase.worker", "ll.demo.ff"].forEach(k => localStorage.removeItem(k))); };
const sample = async page => { await page.goto("/app?sample=1"); await page.waitForURL("**/app"); await expect(page.getByRole("heading", { name: "Home" })).toBeVisible(); };

test("landing offers the three entry points and labels the test network", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Keep a clear record of your pay" })).toBeVisible();
  for (const name of ["Start my records", "Try a sample", "Restore my records"]) await expect(page.getByRole("link", { name })).toBeVisible();
  await expect(page.getByText("Test network", { exact: false }).first()).toBeVisible();
  await expect(page.getByText("S$200 not yet recorded as received")).toBeVisible();
});

test("onboarding: language, ownership, create, backup check with a wrong word then the right ones", async ({ page }) => {
  await fresh(page);
  await page.goto("/app/start");
  await expect(page.getByText("Step 1 of 4")).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Your records stay with you" })).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Your name").fill("Ana");
  await page.getByLabel("Employer").fill("Mr Lim");
  await page.getByLabel("Expected pay each month").fill("650");
  await page.getByRole("button", { name: "Create my records" }).click();
  await expect(page.getByRole("heading", { name: "Save your recovery words" })).toBeVisible();
  await page.getByRole("button", { name: "Show my recovery words" }).click();
  const words = await page.locator("ol.words li").allTextContents();
  expect(words).toHaveLength(12);
  await page.getByRole("button", { name: "I have written them down" }).click();
  const labels = await page.locator("form label").allTextContents();
  const positions = labels.map(l => Number(l.replace(/\D/g, "")));
  await page.getByLabel(labels[0]).fill("wrong");
  await page.getByLabel(labels[1]).fill(words[positions[1] - 1]);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText("That does not match")).toBeVisible();
  await page.getByLabel(labels[0]).fill(words[positions[0] - 1]);
  await page.getByRole("button", { name: "Check" }).click();
  await page.waitForURL("**/app");
  await expect(page.getByText("Hi Ana")).toBeVisible();
  // the recovery words never appear in the URL or in analytics-bound text
  expect(page.url()).not.toContain(words[0]);
});

test("home paybook shows expected, received and difference for the sample", async ({ page }) => {
  await sample(page);
  await expect(page.getByText("Sample record. Nothing here is yours.")).toBeVisible();
  await expect(page.getByText("Not yet recorded as received").first()).toBeVisible();
  await page.goto("/app/records/202607");
  await expect(page.getByText("S$200 short")).toBeVisible();
  await expect(page.getByText("Partly paid").first()).toBeVisible();
  await expect(page.getByText("Saved on this phone only.")).toBeVisible();
});

test("record flow validates partial amounts, previews the payload and saves a draft", async ({ page }) => {
  await sample(page);
  await page.goto("/app/record?period=202610");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByText("Partly paid", { exact: true }).click();
  await page.getByLabel("Amount received").fill("900");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("must be more than zero and less than expected").first()).toBeVisible();
  await page.getByLabel("Amount received").fill("500");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Note").fill("paid on the 12th");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("What will be published")).toBeVisible();
  await expect(page.locator(".payload")).toContainText("50000");
  await expect(page.locator(".payload")).not.toContainText("paid on the 12th");
  await expect(page.getByRole("button", { name: "Publish test record" })).toBeDisabled();
  await page.getByRole("button", { name: "Save as draft" }).click();
  await page.waitForURL("**/app/records/202610");
  await expect(page.getByText("Draft").first()).toBeVisible();
  await page.goto("/app/records");
  await page.getByRole("button", { name: "Drafts" }).click();
  await expect(page.getByRole("link", { name: "October 2026" })).toBeVisible();
  await page.getByRole("button", { name: "Not fully paid" }).click();
  await expect(page.getByRole("link", { name: "July 2026" })).toBeVisible();
  await expect(page.getByRole("link", { name: "August 2026" })).toHaveCount(0);
});

test("restore stops when local records exist", async ({ page }) => {
  await sample(page);
  await page.goto("/app/settings");
  await page.getByRole("button", { name: "Restore different records" }).click();
  await expect(page.getByText("This phone already has records")).toBeVisible();
});

test("share page preselects nothing and the employer page asks before signing", async ({ page }) => {
  await sample(page);
  await page.goto("/app/share");
  await expect(page.getByRole("heading", { name: "No recorded months yet" })).toBeVisible();
  const uid = "0x" + "ab".repeat(32);
  const req = Buffer.from(JSON.stringify({ worker: "0x" + "11".repeat(20), workerName: "Maria", employerLabel: "Mdm Tan", items: [{ uid, period: 202607, amountCents: 50000, status: 3, expectedCents: 70000, respondBy: Date.now() + 86400000 }] })).toString("base64url");
  await page.goto("/employer?c=" + req);
  await expect(page.getByText("Worker recorded", { exact: true })).toBeVisible();
  await expect(page.getByText("Partly paid", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Disagree", exact: true }).click();
  await expect(page.getByText("Disagree with Jul 2026?")).toBeVisible();
  await page.getByRole("button", { name: "Back" }).click();
  await expect(page.getByRole("button", { name: "Acknowledge", exact: true })).toBeVisible();
});
