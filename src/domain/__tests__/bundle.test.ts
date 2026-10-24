import { describe, expect, it } from "vitest";
import { encodeBundle, decodeBundle, encodeEmployerRequest, decodeEmployerRequest, type Bundle } from "../bundle";

const bundle: Bundle = {
  v: 1,
  worker: { address: "0x15CbD48368F3c42F6C7dE71b4CdEc0005427646d", name: "María" },
  employer: { label: "Mdm Tan (+65 9xxx 1234)", id: "0xabc" },
  bankAttestor: "0x511f493a74505E7420E9850E3E4978110D072379",
  issuedAt: 1792834938360,
  items: [{ period: 202607, amountCents: 60000, status: 2, payEventUID: "0xfd09", proof: { uid: "0x29d9", proofJson: '{"a":1,"é":"ü"}' } }],
};

describe("bundle codec", () => {
  it("round-trips unicode and nested JSON through base64url", () => {
    const enc = encodeBundle(bundle);
    expect(enc).not.toMatch(/[+/=]/);
    expect(decodeBundle(enc)).toEqual(bundle);
  });
  it("round-trips employer requests", () => {
    const req = { worker: "0x1", workerName: "Maria", employerLabel: "Tan", items: [{ uid: "0x2", period: 202601, amountCents: 60000, status: 1 as const }] };
    expect(decodeEmployerRequest(encodeEmployerRequest(req))).toEqual(req);
  });
});
