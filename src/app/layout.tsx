import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ToastProvider } from "@/hooks/useToast";
import { I18nProvider } from "@/i18n";
import { Toasts } from "@/components/ui/Toasts";
import { Analytics } from "@vercel/analytics/next";

export const metadata: Metadata = {
  title: { default: "Ledgerline", template: "%s · Ledgerline" },
  description: "The payslip the employer cannot take back. A worker-held, employer-countersigned, bank-proven pay record.",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Ledgerline" },
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || "https://ledgerline-sg.vercel.app"),
  openGraph: { title: "Ledgerline", description: "The payslip the employer cannot take back. Worker-held, employer-countersigned, bank-proven pay records.", type: "website", siteName: "Ledgerline" },
  twitter: { card: "summary_large_image", title: "Ledgerline", description: "The payslip the employer cannot take back." },
};
export const viewport: Viewport = { themeColor: "#f7f5f0", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <I18nProvider>
          <ToastProvider>
            {children}
            <Toasts />
            <Analytics />
          </ToastProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
