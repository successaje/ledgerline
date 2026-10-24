import { Brand } from "./Brand";
import { Pill } from "./Pill";
import { CHAIN_NAME } from "@/services/chain";

export function Shell({ children, nav, wide, brandHref = "/" }: { children: React.ReactNode; nav?: React.ReactNode; wide?: boolean; brandHref?: string }) {
  return (
    <div className="shell">
      <header className="topbar">
        <div className={`container topbar-inner ${wide ? "app-wide" : ""}`}>
          <Brand href={brandHref} />
          <nav className="topbar-nav">{nav ?? <Pill tone="outline" title="All records are written to the Base Sepolia test network">{CHAIN_NAME}</Pill>}</nav>
        </div>
      </header>
      <main className="main"><div className={`container ${wide ? "app-wide" : ""}`}>{children}</div></main>
    </div>
  );
}
