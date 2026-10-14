import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import Providers from "./providers";
import { GlobalLoader } from "@/components/GlobalLoader";
import "@/index.css";
import { chunkRecoveryScript } from '@/lib/chunk-recovery';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://intorza.com"),
  title: { default: "INTORZA – Interior Design Quotation & Invoice Software", template: "%s | INTORZA" },
  description: "Create professional quotations and invoices, manage site measurements, and keep your interior design projects together.",
  applicationName: "INTORZA",
  manifest: "/manifest.json",
  icons: { icon: "/favicon.ico", apple: "/icons/icon-192.webp" },
  // Preserve the existing application's deliberate no-index policy.
  robots: { index: false, follow: false, noarchive: true },
  openGraph: { type: "website", siteName: "INTORZA", images: ["/icons/icon-512.webp"] },
  twitter: { card: "summary_large_image" },
  appleWebApp: { capable: true, title: "INTORZA", statusBarStyle: "default" },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#1e3a5f" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: chunkRecoveryScript }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>
        <div id="root">
          <Suspense fallback={<GlobalLoader message="Opening INTORZA…" fullScreen={false} />}>
            <Providers>{children}</Providers>
          </Suspense>
        </div>
      </body>
    </html>
  );
}
