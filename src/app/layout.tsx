import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppShell } from "@/components/app-shell";

export const metadata: Metadata = {
  title: "TrustiFlow | Trợ lý nghiệp vụ xuất khẩu",
  description: "Không gian làm việc hỗ trợ nghiệp vụ xuất khẩu, xử lý chứng từ và rà soát giao dịch.",
  applicationName: "TrustiFlow",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "TrustiFlow" },
  icons: { icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }], apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }] }
};

export const viewport: Viewport = {
  themeColor: "#10243e",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="vi"><body><AppShell>{children}</AppShell></body></html>;
}
