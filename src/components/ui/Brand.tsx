import Link from "next/link";
export function Brand({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="brand" aria-label="Ledgerline home">
      <span className="brand-mark" aria-hidden><span /></span>
      Ledgerline
    </Link>
  );
}
