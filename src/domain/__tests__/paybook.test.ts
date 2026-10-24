import { describe, it, expect } from "vitest";
import { amounts, employerView, attention, missingPeriods, homePeriod, employerRequestItems } from "../paybook";
import { PAY_STATUS, expectedOf, receivedOf, submissionOf, type Ledger, type PayRecord } from "../types";

const DAY = 86400000;
function ledger(records: PayRecord[], extra: Partial<Ledger["meta"]> = {}): Ledger {
  return { profile: { name: "A", employerLabel: "E", employerId: "0x1", salaryCents: 70000, payDay: 10, payWindow: { fromDay: 1, toDay: 10 }, confirmWindowDays: 3 }, records, meta: { createdAt: 0, ...extra } };
}

describe("expected vs received", () => {
  it("partly paid keeps both numbers and the gap", () => {
    const r: PayRecord = { period: 202607, expectedCents: 70000, amountCents: 50000, status: PAY_STATUS.PARTIAL };
    expect(amounts(r, 70000)).toEqual({ expected: 70000, received: 50000, gap: 20000 });
  });
  it("not paid is zero received even when an older record stored the owed amount", () => {
    const old: PayRecord = { period: 202607, amountCents: 60000, status: PAY_STATUS.UNPAID, payEventUID: "0xa" };
    expect(receivedOf(old)).toBe(0);
    expect(expectedOf(old, 70000)).toBe(70000);
    expect(amounts(old, 70000).gap).toBe(70000);
  });
  it("paid in full without an expected field falls back to the amount", () => {
    const r: PayRecord = { period: 202607, amountCents: 65000, status: PAY_STATUS.PAID };
    expect(amounts(r, 70000)).toEqual({ expected: 65000, received: 65000, gap: 0 });
  });
});

describe("submission state", () => {
  it("derives confirmed / draft for ledgers saved before the field existed", () => {
    expect(submissionOf({ payEventUID: "0xa" })).toBe("confirmed");
    expect(submissionOf({})).toBe("draft");
    expect(submissionOf({ submission: { state: "unknown", at: 0 } })).toBe("unknown");
  });
});

describe("employer view", () => {
  const signed = Date.now() - 1 * DAY;
  const rec: PayRecord = { period: 202607, amountCents: 50000, status: PAY_STATUS.PARTIAL, payEventUID: "0xa", signedAt: signed };
  it("is awaiting before the window and no_response after it, using the single window value", () => {
    const v = employerView(rec, 3);
    expect(v.kind).toBe("waiting");
    if (v.kind === "waiting") expect(v.dueAt).toBe(signed + 3 * DAY);
    expect(employerView(rec, 3, false, signed + 3 * DAY + 1).kind).toBe("no_response");
    expect(employerView(rec, 10, false, signed + 3 * DAY + 1).kind).toBe("waiting");
  });
  it("acknowledged / disagreed come from the countersign", () => {
    expect(employerView({ ...rec, countersign: { uid: "0xc", decision: 1, employer: "0xE", at: 1 } }, 3).kind).toBe("acknowledged");
    expect(employerView({ ...rec, countersign: { uid: "0xc", decision: 2, employer: "0xE", at: 1 } }, 3).kind).toBe("disagreed");
  });
  it("drafts have no employer view", () => {
    expect(employerView({ period: 202607, amountCents: 0, status: PAY_STATUS.UNPAID }, 3).kind).toBe("none");
  });
  it("fast-forward only affects display", () => {
    expect(employerView(rec, 3, true).kind).toBe("no_response");
  });
});

describe("attention", () => {
  it("lists unknown submissions first, then backup, drafts, no response, waiting", () => {
    const now = Date.now();
    const l = ledger([
      { period: 202605, amountCents: 70000, status: PAY_STATUS.PAID, payEventUID: "0x5", signedAt: now - 10 * DAY },
      { period: 202606, amountCents: 70000, status: PAY_STATUS.PAID, payEventUID: "0x6", signedAt: now - 1 * DAY },
      { period: 202607, amountCents: 0, status: PAY_STATUS.UNPAID, submission: { state: "unknown", txHash: "0xt", at: now } },
      { period: 202608, amountCents: 70000, status: PAY_STATUS.PAID },
    ]);
    const kinds = attention(l).map(a => a.kind);
    expect(kinds).toEqual(["unknown", "backup", "drafts", "no_response", "waiting"]);
  });
  it("does not nag about backup in the demo or once verified", () => {
    const base: PayRecord[] = [{ period: 202606, amountCents: 70000, status: PAY_STATUS.PAID, payEventUID: "0x6", signedAt: Date.now() }];
    expect(attention(ledger(base, { demo: true })).some(a => a.kind === "backup")).toBe(false);
    expect(attention(ledger(base, { backupVerifiedAt: 1 })).some(a => a.kind === "backup")).toBe(false);
    expect(attention(ledger(base)).some(a => a.kind === "backup")).toBe(true);
  });
});

describe("home period and gaps", () => {
  it("shows the current month once pay day has passed, otherwise the previous month", () => {
    const l = ledger([]);
    expect(homePeriod(l, new Date(2026, 9, 24))).toBe(202610);
    expect(homePeriod(l, new Date(2026, 9, 3))).toBe(202609);
  });
  it("lists months with no record up to the home period", () => {
    const l = ledger([{ period: 202606, amountCents: 70000, status: PAY_STATUS.PAID }]);
    expect(missingPeriods(l, new Date(2026, 8, 20))).toEqual([202607, 202608, 202609]);
  });
});

describe("employer request", () => {
  it("includes only months on chain without a response, with expected pay and the deadline", () => {
    const signed = 1_700_000_000_000;
    const l = ledger([
      { period: 202606, amountCents: 70000, status: PAY_STATUS.PAID, payEventUID: "0x6", signedAt: signed, countersign: { uid: "0xc", decision: 1, employer: "0xE", at: 1 } },
      { period: 202607, amountCents: 50000, expectedCents: 70000, status: PAY_STATUS.PARTIAL, payEventUID: "0x7", signedAt: signed },
      { period: 202608, amountCents: 70000, status: PAY_STATUS.PAID },
    ]);
    const items = employerRequestItems(l);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ uid: "0x7", period: 202607, amountCents: 50000, expectedCents: 70000, respondBy: signed + 3 * DAY });
  });
});
