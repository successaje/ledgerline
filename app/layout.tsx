import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ledgerline",
  description: "The payslip the employer cannot take back. Worker-held, employer-countersigned, bank-proven pay records.",
  manifest: "/manifest.json",
};
export const viewport: Viewport = { themeColor: "#0f1115", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
