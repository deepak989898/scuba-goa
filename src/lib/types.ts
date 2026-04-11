export type PackageDoc = {
  id: string;
  name: string;
  price: number;
  duration: string;
  includes: string[];
  rating: number;
  slotsLeft?: number;
  bookedToday?: number;
  imageUrl?: string;
  category?: string;
  isCombo?: boolean;
  discountPct?: number;
  limitedSlots?: boolean;
  /** When false, hidden from homepage, booking, and combos. Default true if omitted. */
  active?: boolean;
};

export type BookingPayload = {
  packageId: string;
  packageName: string;
  customerName: string;
  email: string;
  phone: string;
  date: string;
  people: number;
  amountPaise: number;
  /** Hotel / area / address for pickup */
  pickupLocation?: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  status: "pending" | "paid" | "failed";
};

/** Single row in the shopping cart */
/** Firestore `offers` — online checkout promo rules (admin-managed). */
export type OfferDoc = {
  id: string;
  title: string;
  description: string;
  /** Uppercase, no spaces, e.g. COUPLE10 */
  promoCode: string;
  /** 1–50 = percent off cart subtotal before Razorpay. */
  discountPercent: number;
  /** Minimum cart units (people / line qty sum) for this code. Default 1. */
  minCartUnits?: number;
  /** Maximum cart units inclusive; omit for no upper cap. */
  maxCartUnits?: number | null;
  /** UI grouping: Couple, Group, Birthday, Seasonal, etc. */
  category?: string;
  sortOrder?: number;
  /** When false, hidden from /offers and rejected at checkout. */
  active?: boolean;
};

export type CartLine = {
  key: string;
  kind: "service" | "package";
  /** Service slug, package id, or `slug#subKey` for a sub-service line */
  refId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  image?: string;
  duration?: string;
  /** Service card extras (shown in cart) */
  includes?: string[];
  rating?: number;
  slotsLeft?: number;
  bookedToday?: number;
};
