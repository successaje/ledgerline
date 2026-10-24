import { describe, it, expect } from "vitest";
import { fieldsOf } from "../recovery";

const base = { id: "0x1", attester: "0xA", recipient: "0x0", refUID: "0x0", revoked: false, time: 1, schemaId: "0xs", txid: "0xt" };

describe("fieldsOf", () => {
  it("reads v1 attestations as amount only", () => {
    expect(fieldsOf({ ...base, decoded: { period: 202607, amountCents: "60000", status: 2 } })).toEqual({ amountCents: 60000, status: 2, payEventSchema: 1 });
  });
  it("reads v2 attestations with expected, received and supersedes", () => {
    const sup = "0x" + "ab".repeat(32);
    expect(fieldsOf({ ...base, decoded: { period: 202607, expectedCents: "70000", receivedCents: "50000", status: 3, supersedes: sup } })).toEqual({ amountCents: 50000, expectedCents: 70000, status: 3, supersedes: sup, payEventSchema: 2 });
    expect(fieldsOf({ ...base, decoded: { period: 202607, expectedCents: "70000", receivedCents: "0", status: 2, supersedes: "0x" + "00".repeat(32) } }).supersedes).toBeUndefined();
  });
});
