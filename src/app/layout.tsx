import type { Metadata, Viewport } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";
import { DeferredMarketingScripts } from "@/components/DeferredMarketingScripts";
import { MetaPixelRoot } from "@/components/MetaPixelRoot";
import { Providers } from "@/components/Providers";
import { SiteChrome } from "@/components/SiteChrome";
import { SiteJsonLd } from "@/components/SiteJsonLd";
import { PRIMARY_SEO_KEYWORDS, SITE_NAME, SITE_URL } from "@/lib/constants";

const googleSiteVerification =
  process.env.GOOGLE_SITE_VERIFICATION?.trim() ||
  "mEiHRQqqXTK9y5FqG_0BGPkQVO7FwIeuzDSNWEqopzA";

const dm = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `Book Scuba Diving & Water Sports in Goa - Best Prices & Packages`,
    template: `%s | ${SITE_NAME}`,
  },
  description:
    "Experience the thrill of scuba diving and exciting water sports in Goa. Compare live prices, packages & tours—book online with Razorpay and WhatsApp confirmation.",
  keywords: [
    ...PRIMARY_SEO_KEYWORDS,
    "water sports Goa booking",
    "water sports in Goa",
    "scuba diving packages Goa",
    "Goa tour packages",
    "Dudhsagar trip",
    "casino bookings Goa",
  ],
  openGraph: {
    title: `Book Scuba Diving & Water Sports in Goa - Best Prices & Packages`,
    description:
      "Experience the thrill of scuba diving and exciting water sports in Goa. Book your adventure today with clear pricing.",
    url: SITE_URL,
    siteName: SITE_NAME,
    locale: "en_IN",
    type: "website",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", type: "image/x-icon" },
      { url: "/icon.png", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon.png", type: "image/png" }],
    shortcut: ["/favicon.ico"],
  },
  robots: { index: true, follow: true },
  ...(googleSiteVerification
    ? {
        verification: {
          google: googleSiteVerification,
        },
      }
    : {}),
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#faf8f5",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={dm.variable}>
      <head>
        <link rel="preconnect" href="https://images.unsplash.com" crossOrigin="" />
        <link rel="dns-prefetch" href="https://firebasestorage.googleapis.com" />
      </head>
      <body className="site-3d min-h-screen touch-manipulation font-sans antialiased [-webkit-tap-highlight-color:transparent]">
        <SiteJsonLd />
        <Providers>
          <SiteChrome>{children}</SiteChrome>
        </Providers>
        <MetaPixelRoot />
        <DeferredMarketingScripts />
      </body>
    </html>
  );
}
