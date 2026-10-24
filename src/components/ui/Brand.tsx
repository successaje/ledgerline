import Link from "next/link";

/** The Ledgerline mark: three ledger lines, the last one proven (green). Inline so it inherits nothing and renders crisp. */
export function Mark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <rect width="64" height="64" rx="14" fill="#17191C" />
      <path d="M18 23h28M18 32h28" stroke="#F7F5F0" strokeWidth="4.5" strokeLinecap="round" />
      <path d="M18 41h28" stroke="#34D399" strokeWidth="4.5" strokeLinecap="round" />
    </svg>
  );
}

export function Brand({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="brand" aria-label="Ledgerline home">
      <Mark />
      <span>Ledger<span style={{ color: "var(--green)" }}>line</span></span>
    </Link>
  );
}
