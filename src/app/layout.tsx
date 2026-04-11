import type { Metadata, Viewport } from "next";
import { DM_Sans, Outfit } from "next/font/google";
import "./globals.css";
import { MarketingScripts } from "@/components/MarketingScripts";
import { Providers } from "@/components/Providers";
import { SiteChrome } from "@/components/SiteChrome";
import { PRIMARY_SEO_KEYWORDS, SITE_NAME, SITE_URL } from "@/lib/constants";

const googleSiteVerification = process.env.GOOGLE_SITE_VERIFICATION?.trim();

const dm = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} | Scuba Diving in Goa — Book Online`,
    template: `%s | ${SITE_NAME}`,
  },
  description:
    "Book scuba diving in Goa online: clear scuba diving price Goa, best scuba in Goa try-dives & packages, tours and water sports. Secure Razorpay checkout and WhatsApp confirmations.",
  keywords: [
    ...PRIMARY_SEO_KEYWORDS,
    "water sports Goa booking",
    "Goa tour packages",
    "Dudhsagar trip",
    "casino bookings Goa",
  ],
  openGraph: {
    title: `${SITE_NAME} | Scuba Diving in Goa`,
    description:
      "Compare scuba diving price Goa, book the best scuba in Goa for your dates, and pay securely—try dives, boat trips, tours & more.",
    url: SITE_URL,
    siteName: SITE_NAME,
    locale: "en_IN",
    type: "website",
    images: [
      {
        url: "/book-scuba-goa-logo.png",
        width: 1024,
        height: 683,
        alt: "Book Scuba Goa",
      },
    ],
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
    <html lang="en" className={`${dm.variable} ${outfit.variable}`}>
      <body className="site-3d min-h-screen touch-manipulation font-sans antialiased [-webkit-tap-highlight-color:transparent]">
        <Providers>
          <SiteChrome>{children}</SiteChrome>
        </Providers>
        <MarketingScripts />
      </body>
    </html>
  );
}
