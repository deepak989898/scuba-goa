import type { Metadata } from "next";
import { DM_Sans, Outfit } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${dm.variable} ${outfit.variable}`}>
      <body className="min-h-screen font-sans antialiased">
        <Header />
        <main className="pb-24 md:pb-0">{children}</main>
        <Footer />
        <WhatsAppFloat />
        <StickyBookBar />
        <AiChatbot />
      </body>
    </html>
  );
}
