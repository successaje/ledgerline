import { describe, expect, it } from "vitest";
import { statementFor, creditsInWindow } from "../bank-data";

describe("synthetic statement", () => {
  const txns = statementFor("maria");
  it("has a salary credit every month except July", () => {
    const salaries = txns.filter(t => t.counterparty === "TAN M L" && t.creditCents === 60000);
    expect(salaries.map(s => s.date.slice(5, 7))).toEqual(["01", "02", "03", "04", "05", "06", "08", "09", "10"]);
  });
  it("finds no salary-sized credit in the July window but one in June", () => {
    expect(creditsInWindow(txns, "2026-07-01", "2026-07-10", 60000)).toHaveLength(0);
    expect(creditsInWindow(txns, "2026-06-01", "2026-06-10", 60000)).toHaveLength(1);
  });
  it("ignores small unrelated credits", () => {
    expect(creditsInWindow(txns, "2026-07-01", "2026-07-31", 60000)).toHaveLength(0);
    expect(creditsInWindow(txns, "2026-07-01", "2026-07-31", 1)).toHaveLength(1);
  });
});
