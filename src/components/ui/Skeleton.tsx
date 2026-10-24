export function Skeleton({ h = 16, w = "100%", style }: { h?: number; w?: number | string; style?: React.CSSProperties }) {
  return <div className="skeleton" style={{ height: h, width: w, ...style }} aria-hidden />;
}
export function LedgerSkeleton() {
  return (
    <div className="ledger" aria-busy="true" aria-label="Loading ledger">
      <div className="ledger-head"><Skeleton h={18} w={160} /><Skeleton h={18} w={60} /></div>
      {[0, 1, 2, 3, 4].map(i => (
        <div key={i} className="row" style={{ cursor: "default" }}>
          <div style={{ display: "grid", gap: 8 }}><Skeleton h={16} w={110} /><Skeleton h={12} w={180} /></div>
          <Skeleton h={24} w={64} style={{ borderRadius: 999 }} />
        </div>
      ))}
    </div>
  );
}
