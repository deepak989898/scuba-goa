"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { DeferredSiteWidgets } from "@/components/DeferredSiteWidgets";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { ScrollProgressBar } from "@/components/ScrollProgressBar";
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
      <ScrollProgressBar />
      <Header />
      {/*
        Mobile sticky bar is ~6.5rem tall + safe-area inset. 7.5rem reserves a
        small visual gap so footer text never touches the bar.
      */}
      <main className="pb-[calc(7.5rem+env(safe-area-inset-bottom,0px))] md:pb-0">
        {children}
      </main>
      <Footer />
      <WhatsAppFloat />
      <StickyBookBar />
      <DeferredSiteWidgets />
    </>
  );
}
