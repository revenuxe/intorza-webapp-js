import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Suspense } from "react";
import Providers from "./providers";
import { GlobalLoader } from "@/components/GlobalLoader";
import { MetaPixelPageView } from "@/components/MetaPixelPageView";
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
        <Script id="google-tag-manager" strategy="beforeInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-MHX3NVH8');`}
        </Script>
        <script dangerouslySetInnerHTML={{ __html: chunkRecoveryScript }} />
        <Script id="meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '2287378132058301');
fbq('track', 'PageView');`}
        </Script>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-MHX3NVH8"
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
            title="Google Tag Manager"
          />
        </noscript>
        <noscript>
          <img height="1" width="1" style={{ display: "none" }} alt="" src="https://www.facebook.com/tr?id=2287378132058301&ev=PageView&noscript=1" />
        </noscript>
        <div id="root">
          <Suspense fallback={<GlobalLoader message="Opening INTORZA…" fullScreen={false} />}>
            <Providers>
              <MetaPixelPageView />
              {children}
            </Providers>
          </Suspense>
        </div>
      </body>
    </html>
  );
}
