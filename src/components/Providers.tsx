"use client";

import type { ReactNode } from "react";
import dynamic from "next/dynamic";
import { Suspense } from "react";
import { CartProvider } from "@/context/CartContext";

const AnalyticsTracker = dynamic(
  () => import("@/components/AnalyticsTracker").then((m) => m.AnalyticsTracker),
  { ssr: false, loading: () => null },
);

export function Providers({ children }: { children: ReactNode }) {
  return (
    <CartProvider>
      <Suspense fallback={null}>
        <AnalyticsTracker />
      </Suspense>
      {children}
    </CartProvider>
  );
}
