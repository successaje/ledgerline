type Props = { name: "check" | "x" | "alert" | "clock" | "link" | "shield" | "bank" | "share" | "copy" | "chevron" | "info" | "arrow" | "lock" | "refresh" | "whatsapp"; size?: number; className?: string };

const paths: Record<Props["name"], React.ReactNode> = {
  check: <path d="M5 12.5l4.2 4.2L19 7.5" />,
  x: <path d="M6 6l12 12M18 6L6 18" />,
  alert: <><path d="M12 9v4" /><path d="M12 17h.01" /><path d="M10.3 3.9L2.5 17.6A2 2 0 004.2 20.6h15.6a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  link: <><path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1" /></>,
  shield: <path d="M12 3l7 3v6c0 4.5-3 7.8-7 9-4-1.2-7-4.5-7-9V6l7-3z" />,
  bank: <><path d="M3 10h18L12 4 3 10z" /><path d="M5 10v8M9 10v8M15 10v8M19 10v8" /><path d="M3 20h18" /></>,
  share: <><path d="M12 3v12" /><path d="M8 7l4-4 4 4" /><path d="M5 12v7a1 1 0 001 1h12a1 1 0 001-1v-7" /></>,
  copy: <><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a1 1 0 011-1h9" /></>,
  chevron: <path d="M9 6l6 6-6 6" />,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5" /><path d="M12 8h.01" /></>,
  arrow: <><path d="M5 12h14" /><path d="M13 6l6 6-6 6" /></>,
  lock: <><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 018 0v3" /></>,
  refresh: <><path d="M20 12a8 8 0 01-14 5.3" /><path d="M4 12a8 8 0 0114-5.3" /><path d="M18 3v4h-4" /><path d="M6 21v-4h4" /></>,
  whatsapp: <><path d="M4 20l1.3-3.8A8 8 0 1110.6 19L4 20z" /><path d="M9.5 9.5c.3 1.6 1.8 3.1 3.4 3.4l1.1-1.1 1.8.9c-.3 1.3-1.3 1.8-2.4 1.6-2.6-.5-5.3-3.2-5.8-5.8-.2-1.1.3-2.1 1.6-2.4l.9 1.8-1.1 1.1z" /></>,
};

export function Icon({ name, size = 18, className }: Props) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}
