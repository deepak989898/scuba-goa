"use client";

import dynamic from "next/dynamic";

const PaymentSuccessBanner = dynamic(
  () =>
    import("@/components/PaymentSuccessBanner").then(
      (m) => m.PaymentSuccessBanner,
    ),
  { ssr: false, loading: () => null },
);

export function PaymentSuccessBannerSlot() {
  return <PaymentSuccessBanner />;
}
