"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { CartLine } from "@/lib/types";

const STORAGE_KEY = "bookscubagoa-cart-v1";

type CartContextValue = {
  lines: CartLine[];
  ready: boolean;
  itemCount: number;
  subtotalInr: number;
  addService: (input: {
    slug: string;
    title: string;
    priceFrom: number;
    image?: string;
    duration?: string;
    includes?: string[];
    rating?: number;
    slotsLeft?: number;
    bookedToday?: number;
  }) => void;
  addPackage: (input: {
    id: string;
    name: string;
    price: number;
    image?: string;
    duration?: string;
  }) => void;
  setQuantity: (key: string, quantity: number) => void;
  removeLine: (key: string) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CartLine[];
        if (Array.isArray(parsed)) setLines(parsed);
      }
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {
      /* ignore */
    }
  }, [lines, ready]);

  const addService = useCallback(
    (input: {
      slug: string;
      title: string;
      priceFrom: number;
      image?: string;
      duration?: string;
      includes?: string[];
      rating?: number;
      slotsLeft?: number;
      bookedToday?: number;
    }) => {
      const key = `service:${input.slug}`;
      setLines((prev) => {
        const i = prev.findIndex((l) => l.key === key);
        if (i >= 0) {
          const next = [...prev];
          const row = next[i]!;
          next[i] = { ...row, quantity: row.quantity + 1 };
          return next;
        }
        return [
          ...prev,
          {
            key,
            kind: "service",
            refId: input.slug,
            name: input.title,
            unitPrice: input.priceFrom,
            quantity: 1,
            image: input.image,
            duration: input.duration,
            includes: input.includes,
            rating: input.rating,
            slotsLeft: input.slotsLeft,
            bookedToday: input.bookedToday,
          },
        ];
      });
    },
    []
  );

  const addPackage = useCallback(
    (input: {
      id: string;
      name: string;
      price: number;
      image?: string;
      duration?: string;
    }) => {
      const key = `package:${input.id}`;
      setLines((prev) => {
        const i = prev.findIndex((l) => l.key === key);
        if (i >= 0) {
          const next = [...prev];
          const row = next[i]!;
          next[i] = { ...row, quantity: row.quantity + 1 };
          return next;
        }
        return [
          ...prev,
          {
            key,
            kind: "package",
            refId: input.id,
            name: input.name,
            unitPrice: input.price,
            quantity: 1,
            image: input.image,
            duration: input.duration,
          },
        ];
      });
    },
    []
  );

  const setQuantity = useCallback((key: string, quantity: number) => {
    const q = Math.max(0, Math.min(99, Math.floor(quantity)));
    setLines((prev) => {
      if (q === 0) return prev.filter((l) => l.key !== key);
      return prev.map((l) => (l.key === key ? { ...l, quantity: q } : l));
    });
  }, []);

  const removeLine = useCallback((key: string) => {
    setLines((prev) => prev.filter((l) => l.key !== key));
  }, []);

  const clearCart = useCallback(() => setLines([]), []);

  const { itemCount, subtotalInr } = useMemo(() => {
    let count = 0;
    let sub = 0;
    for (const l of lines) {
      count += l.quantity;
      sub += l.unitPrice * l.quantity;
    }
    return { itemCount: count, subtotalInr: sub };
  }, [lines]);

  const value = useMemo(
    () => ({
      lines,
      ready,
      itemCount,
      subtotalInr,
      addService,
      addPackage,
      setQuantity,
      removeLine,
      clearCart,
    }),
    [
      lines,
      ready,
      itemCount,
      subtotalInr,
      addService,
      addPackage,
      setQuantity,
      removeLine,
      clearCart,
    ]
  );

  return (
    <CartContext.Provider value={value}>{children}</CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
