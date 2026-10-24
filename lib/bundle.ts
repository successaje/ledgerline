export type BundleItem = {
  period: number;
  amountCents: number;
  status: number;
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

function b64url(s: string) {
  const b = typeof window !== "undefined" ? window.btoa(unescape(encodeURIComponent(s))) : Buffer.from(s, "utf8").toString("base64");
  return b.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function unb64url(s: string) {
  const b = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
  return typeof window !== "undefined" ? decodeURIComponent(escape(window.atob(b))) : Buffer.from(b, "base64").toString("utf8");
}
export function encodeBundle(b: Bundle) { return b64url(JSON.stringify(b)); }
export function decodeBundle(s: string): Bundle { return JSON.parse(unb64url(s)) as Bundle; }
