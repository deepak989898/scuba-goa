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
