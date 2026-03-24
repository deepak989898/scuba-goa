"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { AiChatbot } from "@/components/AiChatbot";
import { CartFAB } from "@/components/cart/CartFAB";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { StickyBookBar } from "@/components/StickyBookBar";
import { WhatsAppFloat } from "@/components/WhatsAppFloat";

/**
 * Public marketing chrome (header, footer, FABs) is hidden under `/admin/*`
 * so only the admin shell nav appears.
 */
export function SiteChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin") ?? false;

  if (isAdmin) {
    return <>{children}</>;
  }

  return (
    <>
      <Header />
      <main className="pb-[calc(7.5rem+env(safe-area-inset-bottom,0px))] md:pb-0">
        {children}
      </main>
      <Footer />
      <CartFAB />
      <WhatsAppFloat />
      <StickyBookBar />
      <AiChatbot />
    </>
  );
}
