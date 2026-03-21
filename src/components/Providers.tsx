"use client";

import type { ReactNode } from "react";
import { Suspense } from "react";
import { AnalyticsTracker } from "@/components/AnalyticsTracker";
import { CartProvider } from "@/context/CartContext";

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
