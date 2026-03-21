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
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  status: "pending" | "paid" | "failed";
};

/** Single row in the shopping cart */
export type CartLine = {
  key: string;
  kind: "service" | "package";
  refId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  image?: string;
  duration?: string;
};
