import { describe, expect, it, vi } from "vitest";

const track = vi.hoisted(() => vi.fn());
vi.mock("@vercel/analytics", () => ({ track }));
import { logEvent, SENSITIVE_KEYS } from "../analytics";

describe("telemetry never carries sensitive fields", () => {
  it("drops properties whose names look sensitive and keeps counts", () => {
    logEvent("record_done", { months: 3, name: "Maria", amountCents: 50000, phrase: "abc", note: "x", token: "t", address: "0x1" } as never);
    expect(track).toHaveBeenCalledWith("record_done", { months: 3 });
  });
  it("lists the denylist used by the guard", () => {
    for (const k of ["name", "amount", "phrase", "key", "note", "token", "address", "uid", "url"]) expect(SENSITIVE_KEYS.some(s => k.includes(s))).toBe(true);
  });
});
