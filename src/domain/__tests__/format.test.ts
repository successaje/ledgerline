import { describe, expect, it } from "vitest";
import { periodLabel, periodWindow, sgd, prevPeriod, shortAddr } from "../format";

describe("format", () => {
  it("labels periods", () => {
    expect(periodLabel(202607)).toBe("Jul 2026");
    expect(periodLabel(202601, true)).toBe("January 2026");
  });
  it("builds pay windows with zero padding", () => {
    expect(periodWindow(202607, 1, 10)).toEqual({ from: "2026-07-01", to: "2026-07-10" });
  });
  it("formats Singapore dollars from cents", () => {
    expect(sgd(60000)).toBe("S$600");
    expect(sgd(123456n)).toBe("S$1,234.56");
  });
  it("walks periods across year boundaries", () => {
    expect(prevPeriod(202601)).toBe(202512);
    expect(prevPeriod(202607)).toBe(202606);
  });
  it("shortens addresses", () => {
    expect(shortAddr("0x15CbD48368F3c42F6C7dE71b4CdEc0005427646d")).toBe("0x15CbD4…646d");
  });
});
