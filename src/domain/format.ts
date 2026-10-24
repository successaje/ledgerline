import type { Period } from "./types";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function periodLabel(period: Period, long = false) {
  const y = Math.floor(period / 100);
  const m = period % 100;
  const name = long ? new Date(y, m - 1, 1).toLocaleString("en-SG", { month: "long" }) : MONTHS[m - 1];
  return `${name} ${y}`;
}

export function periodWindow(period: Period, fromDay: number, toDay: number) {
  const y = Math.floor(period / 100);
  const m = String(period % 100).padStart(2, "0");
  return { from: `${y}-${m}-${String(fromDay).padStart(2, "0")}`, to: `${y}-${m}-${String(toDay).padStart(2, "0")}` };
}

export function sgd(cents: number | bigint) {
  const n = Number(cents) / 100;
  return `S$${n.toLocaleString("en-SG", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function shortAddr(a: string, n = 6) {
  return a ? `${a.slice(0, 2 + n)}…${a.slice(-4)}` : "";
}

export function daysSince(ms: number) {
  return (Date.now() - ms) / 86400000;
}

export function dateLabel(d: string) {
  const [y, m, day] = d.split("-").map(Number);
  return `${day} ${MONTHS[m - 1]} ${y}`;
}

export function currentPeriod(): Period {
  const d = new Date();
  return d.getFullYear() * 100 + d.getMonth() + 1;
}

export function prevPeriod(p: Period): Period {
  const y = Math.floor(p / 100), m = p % 100;
  return m === 1 ? (y - 1) * 100 + 12 : p - 1;
}
