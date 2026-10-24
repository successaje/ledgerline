type Tone = "neutral" | "ok" | "bad" | "warn" | "info" | "outline";
export function Pill({ tone = "neutral", dot, children, title }: { tone?: Tone; dot?: boolean; children: React.ReactNode; title?: string }) {
  return <span className={`pill pill-${tone}`} title={title}>{dot && <span className="dot" aria-hidden />}{children}</span>;
}
