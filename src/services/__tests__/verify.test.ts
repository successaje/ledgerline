import { describe, expect, it, vi, beforeEach } from "vitest";
import type { Bundle } from "@/domain/bundle";

// The verifier reads the EAS indexer; mock it so the semantics can be tested deterministically.
const chain = vi.hoisted(() => ({ getAttestation: vi.fn(), getReferencing: vi.fn() }));
vi.mock("@/services/chain", () => ({ getAttestation: chain.getAttestation, getReferencing: chain.getReferencing }));

import { verifyItem, paymentLabel } from "../verify";

const WORKER = "0x15CbD48368F3c42F6C7dE71b4CdEc0005427646d";
const now = Math.floor(Date.now() / 1000);
const schemas = { countersign: "0xcs" };
const link = (uid: string) => `https://example/${uid}`;

function bundle(status: 1 | 2 | 3, amountCents: number, windowDays = 3): Bundle {
  return { v: 1, worker: { address: WORKER, name: "Maria" }, employer: { label: "Tan", id: "0x1" }, bankAttestor: "", issuedAt: Date.now(), responseWindowDays: windowDays,
    items: [{ period: 202610, amountCents, status, payEventUID: "0xpe" }] };
}
function payEvent(status: number, amountCents: number, time = now) {
  return { id: "0xpe", attester: WORKER, recipient: "0x0", refUID: "0x0", revoked: false, time, schemaId: "0xs", txid: "0xt", decoded: { period: 202610, amountCents: String(amountCents), status } };
}

beforeEach(() => { chain.getAttestation.mockReset(); chain.getReferencing.mockReset(); });

describe("payment labels survive every view", () => {
  it("keeps Partly paid for S$500 received of S$700 expected", async () => {
    chain.getAttestation.mockResolvedValue(payEvent(3, 50000));
    chain.getReferencing.mockResolvedValue([]);
    const b = bundle(3, 50000);
    const v = await verifyItem(b, b.items[0], schemas, link);
    expect(v.paymentLabel).toBe("Partly paid");
    expect(v.sentence).toContain("partly paid (S$500 received)");
    expect(v.sentence).not.toContain("as paid");
    expect(paymentLabel(3)).toBe("Partly paid");
  });
});

describe("employer response window", () => {
  it("is Not checked and Awaiting before the deadline, at day zero", async () => {
    chain.getAttestation.mockResolvedValue(payEvent(2, 70000));
    chain.getReferencing.mockResolvedValue([]);
    const b = bundle(2, 70000, 3);
    const v = await verifyItem(b, b.items[0], schemas, link);
    const resp = v.checks.find(c => c.category === "response")!;
    expect(resp.outcome).toBe("not_checked");
    expect(resp.label).toMatch(/^Awaiting employer response/);
    expect(v.sentence).toContain("response window is still open");
  });
  it("is Failed with neutral wording after the deadline, using the bundle's window", async () => {
    chain.getAttestation.mockResolvedValue(payEvent(2, 70000, now - 5 * 86400));
    chain.getReferencing.mockResolvedValue([]);
    const b = bundle(2, 70000, 3);
    const v = await verifyItem(b, b.items[0], schemas, link);
    const resp = v.checks.find(c => c.category === "response")!;
    expect(resp.outcome).toBe("failed");
    expect(resp.label).toMatch(/^No employer response recorded by the deadline/);
    expect(resp.detail).toContain("not a finding of wrongdoing");
  });
  it("respects a longer configured window", async () => {
    chain.getAttestation.mockResolvedValue(payEvent(2, 70000, now - 5 * 86400));
    chain.getReferencing.mockResolvedValue([]);
    const b = bundle(2, 70000, 10);
    const v = await verifyItem(b, b.items[0], schemas, link);
    expect(v.checks.find(c => c.category === "response")!.outcome).toBe("not_checked");
  });
  it("records an acknowledgment of Not paid without turning it into Paid", async () => {
    chain.getAttestation.mockResolvedValue(payEvent(2, 70000));
    chain.getReferencing.mockResolvedValue([{ id: "0xcs1", attester: "0xEmp", recipient: WORKER, refUID: "0xpe", revoked: false, time: now, schemaId: "0xcs", txid: "0x", decoded: { decision: 1 } }]);
    const b = bundle(2, 70000);
    const v = await verifyItem(b, b.items[0], schemas, link);
    expect(v.paymentLabel).toBe("Not paid");
    expect(v.checks.find(c => c.category === "response")!.label).toContain('acknowledged "Not paid"');
    expect(v.sentence).toContain("acknowledged this statement");
  });
});

describe("unavailable is never failed", () => {
  it("marks an index timeout as Unavailable", async () => {
    chain.getAttestation.mockRejectedValue(new Error("indexer timeout"));
    const b = bundle(1, 70000);
    const v = await verifyItem(b, b.items[0], schemas, link);
    expect(v.checks[0].outcome).toBe("unavailable");
    expect(v.found).toBe(false);
  });
  it("marks a missing proof as Unavailable, not Failed", async () => {
    chain.getAttestation.mockImplementation(async (uid: string) => (uid === "0xpe" ? payEvent(2, 70000) : null));
    chain.getReferencing.mockResolvedValue([]);
    const b = bundle(2, 70000);
    b.items[0].proof = { uid: "0xproof", proofJson: "{}" };
    const v = await verifyItem(b, b.items[0], schemas, link);
    expect(v.checks.find(c => c.category === "evidence")!.outcome).toBe("unavailable");
  });
  it("says Not checked when the bundle carries no evidence", async () => {
    chain.getAttestation.mockResolvedValue(payEvent(1, 70000));
    chain.getReferencing.mockResolvedValue([]);
    const b = bundle(1, 70000);
    const v = await verifyItem(b, b.items[0], schemas, link);
    expect(v.checks.find(c => c.category === "evidence")!.outcome).toBe("not_checked");
  });
});
