import type { Metadata, Viewport } from "next";
import { DM_Sans, Outfit } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { SiteChrome } from "@/components/SiteChrome";
import { SITE_NAME, SITE_URL } from "@/lib/constants";

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
    default: `${SITE_NAME} | Scuba Diving Goa & Tour Packages`,
    template: `%s | ${SITE_NAME}`,
  },
  description:
    "Book scuba diving Goa, water sports Goa booking, North & South Goa tours, Dudhsagar, casinos, clubs, flyboarding & bungee. WhatsApp instant confirm + Razorpay.",
  keywords: [
    "scuba diving Goa",
    "water sports Goa booking",
    "Goa tour packages",
    "Dudhsagar trip",
    "casino bookings Goa",
  ],
  openGraph: {
    title: `${SITE_NAME} | Premium Goa Experiences`,
    description:
      "Luxury-light ocean adventures with transparent pricing and secure payments.",
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
    icon: [{ url: "/icon.png", type: "image/png" }],
    apple: [{ url: "/apple-icon.png", type: "image/png" }],
    shortcut: ["/icon.png"],
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
      </body>
    </html>
  );
}
