import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ToastProvider } from "@/hooks/useToast";
import { Toasts } from "@/components/ui/Toasts";

export const metadata: Metadata = {
  title: { default: "Ledgerline", template: "%s · Ledgerline" },
  description: "The payslip the employer cannot take back. A worker-held, employer-countersigned, bank-proven pay record.",
  manifest: "/manifest.json",
  openGraph: { title: "Ledgerline", description: "The payslip the employer cannot take back.", type: "website" },
};
export const viewport: Viewport = { themeColor: "#f7f5f0", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ToastProvider>
          {children}
          <Toasts />
        </ToastProvider>
      </body>
    </html>
  );
}
