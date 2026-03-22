import type { Metadata, Viewport } from "next";
import { DM_Sans, Outfit } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Providers } from "@/components/Providers";
import { CartFAB } from "@/components/cart/CartFAB";
import { WhatsAppFloat } from "@/components/WhatsAppFloat";
import { StickyBookBar } from "@/components/StickyBookBar";
import { AiChatbot } from "@/components/AiChatbot";
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
      <body className="min-h-screen touch-manipulation font-sans antialiased [-webkit-tap-highlight-color:transparent]">
        <Providers>
          <Header />
          <main className="pb-[calc(7.5rem+env(safe-area-inset-bottom,0px))] md:pb-0">
            {children}
          </main>
          <Footer />
          <CartFAB />
          <WhatsAppFloat />
          <StickyBookBar />
          <AiChatbot />
        </Providers>
      </body>
    </html>
  );
}
