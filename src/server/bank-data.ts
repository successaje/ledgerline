// Synthetic bank: a stand-in for a DBS/POSB statement page. Deterministic dataset for the demo worker.
export type Txn = { date: string; description: string; creditCents: number; debitCents: number; counterparty: string };

export function statementFor(account: string): Txn[] {
  // Salary from "TAN M L" arrives around the 3rd of each month, except July 2026.
  const txns: Txn[] = [];
  for (let m = 1; m <= 10; m++) {
    const mm = String(m).padStart(2, "0");
    if (m !== 7) txns.push({ date: `2026-${mm}-03`, description: "FAST Transfer SALARY", creditCents: 60000, debitCents: 0, counterparty: "TAN M L" });
    txns.push({ date: `2026-${mm}-05`, description: "Remittance to PH", creditCents: 0, debitCents: 35000, counterparty: "WISE ASIA" });
    txns.push({ date: `2026-${mm}-12`, description: "Prepaid top-up", creditCents: 0, debitCents: 1500, counterparty: "SINGTEL" });
    if (m % 3 === 0) txns.push({ date: `2026-${mm}-20`, description: "NETS purchase", creditCents: 0, debitCents: 4280, counterparty: "FAIRPRICE" });
  }
  // One unrelated credit in July, smaller than a salary, to show the predicate is about amount and window.
  txns.push({ date: "2026-07-15", description: "FAST Transfer", creditCents: 5000, debitCents: 0, counterparty: "R SANTOS" });
  txns.sort((a, b) => a.date.localeCompare(b.date));
  void account;
  return txns;
}

export function creditsInWindow(txns: Txn[], from: string, to: string, minAmountCents: number) {
  return txns.filter(t => t.creditCents >= minAmountCents && t.date >= from && t.date <= to);
}
