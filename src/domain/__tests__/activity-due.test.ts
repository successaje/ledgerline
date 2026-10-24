import { describe, expect, it } from "vitest";
import { deriveActivity, sinceLastVisit } from "../activity";
import { computeDue, periodDue, nextPeriod } from "../due";
import type { Ledger } from "../types";

const base: Ledger = {
  profile: { name: "Maria", employerLabel: "Tan", employerId: "0x1", salaryCents: 60000, payWindow: { fromDay: 1, toDay: 10 }, confirmWindowDays: 3 },
  meta: { createdAt: 1 },
  records: [
    { period: 202606, amountCents: 60000, status: 1, payEventUID: "0xa", signedAt: 1000, countersign: { uid: "0xb", decision: 1, employer: "0xe", at: 2000 } },
    { period: 202607, amountCents: 60000, status: 2, payEventUID: "0xc", signedAt: 1500, proof: { uid: "0xd", satisfied: true, method: 2, summary: "", proofJson: "{}", window: { from: "", to: "" }, at: 3000 } },
    { period: 202608, amountCents: 60000, status: 1 },
  ],
};

describe("activity", () => {
  it("derives newest-first human-readable events", () => {
    const ev = deriveActivity(base);
    expect(ev.map(e => e.kind)).toEqual(["proof", "confirmed", "unpaid", "recorded"]);
    expect(ev[1].text).toBe("Employer confirmed Jun 2026");
    expect(ev[2].text).toContain("not paid");
  });
  it("reports employer answers since the last visit only", () => {
    expect(sinceLastVisit(base, 1800).map(e => e.kind)).toEqual(["confirmed"]);
    expect(sinceLastVisit(base, undefined)).toEqual([]);
  });
});

describe("due", () => {
  it("picks the current month after the pay window closes, else the previous month", () => {
    expect(periodDue(new Date(2026, 9, 24), 10)).toBe(202610);
    expect(periodDue(new Date(2026, 9, 5), 10)).toBe(202609);
    expect(nextPeriod(202612)).toBe(202701);
  });
  it("lists a draft and a due month, most important first", () => {
    const d = computeDue(base, new Date(2026, 8, 20));
    expect(d[0]).toEqual({ kind: "record-month", period: 202609 });
    expect(d[1]).toEqual({ kind: "draft", count: 1 });
  });
  it("asks for the first month when nothing is recorded", () => {
    expect(computeDue({ ...base, records: [] })[0]).toEqual({ kind: "first-month" });
  });
});
