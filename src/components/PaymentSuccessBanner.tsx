"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export function PaymentSuccessBanner() {
  const sp = useSearchParams();
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);

  useEffect(() => {
    if (sp.get("payment") !== "success") return;
    setVisible(true);
    try {
      const n = sessionStorage.getItem("paymentNotice");
      if (n) {
        setWarning(n);
        sessionStorage.removeItem("paymentNotice");
      }
    } catch {
      /* ignore */
    }
    router.replace("/", { scroll: false });
  }, [sp, router]);

  if (!visible) return null;

  return (
    <div className="border-b border-ocean-200 bg-ocean-50 px-4 py-3 text-center text-sm text-ocean-900">
      <p className="font-medium">
        Payment received. Check your email for confirmation and your PDF bill (when
        email is configured).
      </p>
      {warning ? (
        <p className="mt-2 text-left text-xs text-amber-900 md:mx-auto md:max-w-2xl">
          {warning}
        </p>
      ) : null}
    </div>
  );
}
