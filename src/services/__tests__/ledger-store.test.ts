// Runs in node: ledger-store only touches window inside load/save, which these tests do not call.
import { describe, it, expect } from "vitest";
import { normalise, sampleLedger, upsertRecord } from "../ledger-store";
import { PAY_STATUS, type Ledger } from "@/domain/types";

describe("normalise", () => {
  it("fills expected, submission and pay day for a ledger saved by the previous release", () => {
    const old = {
      profile: { name: "Maria", employerLabel: "Mdm Tan", employerId: "0x1", salaryCents: 60000, payWindow: { fromDay: 1, toDay: 10 }, confirmWindowDays: 3, sample: true },
      records: [
        { period: 202606, amountCents: 60000, status: PAY_STATUS.PAID, payEventUID: "0x6", payEventTx: "0xt6", signedAt: 5 },
        { period: 202607, amountCents: 60000, status: PAY_STATUS.UNPAID },
      ],
      meta: { createdAt: 1 },
    } as unknown as Ledger;
    const l = normalise(old);
    expect(l.profile.payDay).toBe(10);
    expect(l.meta.demo).toBe(true);
    expect(l.records[0].expectedCents).toBe(60000);
    expect(l.records[0].submission).toMatchObject({ state: "confirmed", txHash: "0xt6" });
    expect(l.records[1].expectedCents).toBe(60000);
    expect(l.records[1].submission?.state).toBe("draft");
  });
  it("sample is S$700 expected with July partly paid at S$500", () => {
    const l = sampleLedger();
    const july = l.records.find(r => r.period === 202607)!;
    expect(l.profile.salaryCents).toBe(70000);
    expect(july.status).toBe(PAY_STATUS.PARTIAL);
    expect(july.amountCents).toBe(50000);
    expect(l.meta.demo).toBe(true);
  });
  it("upsert creates a draft with expected pay from the profile", () => {
    const l = upsertRecord(sampleLedger(), 202610, { status: PAY_STATUS.UNPAID, amountCents: 0 });
    const oct = l.records.find(r => r.period === 202610)!;
    expect(oct.expectedCents).toBe(70000);
    expect(oct.submission?.state).toBe("draft");
  });
});
