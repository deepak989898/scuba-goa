"use client";

import type { ReactNode } from "react";
import { Suspense } from "react";
import { CartProvider } from "@/context/CartContext";
import { DeferredAnalyticsTracker } from "@/components/DeferredAnalyticsTracker";

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
