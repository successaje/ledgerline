import type { Metadata } from "next";
import { LedgerProvider } from "@/components/worker/LedgerContext";

export const metadata: Metadata = { title: "Your records" };

export default function WorkerLayout({ children }: { children: React.ReactNode }) {
  return <LedgerProvider>{children}</LedgerProvider>;
}
