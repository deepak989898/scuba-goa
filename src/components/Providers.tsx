"use client";

import type { ReactNode } from "react";
import { Suspense } from "react";
import { DeferredAnalyticsTracker } from "@/components/DeferredAnalyticsTracker";
import { CartProvider } from "@/context/CartContext";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <CartProvider>
      <Suspense fallback={null}>
        <DeferredAnalyticsTracker />
      </Suspense>
      {children}
    </CartProvider>
  );
}
