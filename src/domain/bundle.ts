import type { PayStatus, Period } from "./types";

/** A dispute bundle is what the worker chooses to disclose. It is self-contained and re-verifiable from chain. */
export type BundleItem = {
  period: Period;
  amountCents: number;
  status: PayStatus;
  payEventUID: string;
  countersignUID?: string;
  proof?: { uid: string; proofJson: string };
};

export type Bundle = {
  v: 1;
  worker: { address: string; name: string };
  employer: { label: string; id: string };
  bankAttestor: string;
  issuedAt: number;
  items: BundleItem[];
};

export function encodeBase64Url(s: string) {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  bytes.forEach(b => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeBase64Url(s: string) {
  const b = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
  const bin = atob(b);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

export function encodeBundle(b: Bundle) { return encodeBase64Url(JSON.stringify(b)); }
export function decodeBundle(s: string): Bundle { return JSON.parse(decodeBase64Url(s)) as Bundle; }

export type EmployerRequest = {
  worker: string;
  workerName: string;
  employerLabel: string;
  items: { uid: string; period: Period; amountCents: number; status: PayStatus }[];
};
export function encodeEmployerRequest(r: EmployerRequest) { return encodeBase64Url(JSON.stringify(r)); }
export function decodeEmployerRequest(s: string): EmployerRequest { return JSON.parse(decodeBase64Url(s)) as EmployerRequest; }
