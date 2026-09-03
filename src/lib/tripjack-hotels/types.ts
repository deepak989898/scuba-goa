/** TripJack Hotels module — Goa-only catalog + bookings (isolated from scuba bookings). */

export const HOTEL_FIRESTORE = {
  catalog: "tripjackHotelCatalog",
  destinations: "tripjackHotelDestinations",
  bookings: "hotelBookings",
  catalogMeta: "tripjackHotelCatalogMeta",
  settings: "siteSettings",
} as const;

export const GOA_DESTINATION_KEY = "goa-india";

export type HotelBookingStatus =
  | "review_confirmed"
  | "payment_pending"
  | "payment_success"
  | "paid"
  | "payment_failed"
  | "pending_admin_confirmation"
  | "confirmed"
  | "cancelled";

export type HotelPaymentStatus = "pending" | "paid" | "failed";

export type TripjackHotelCatalogDoc = {
  tjHotelId: string;
  name: string;
  city: string;
  cityNameLower: string;
  locality?: string;
  country: string;
  images: string[];
  starRating?: number;
  websiteVisible: boolean;
  /** Cached display price (INR) — fallback when live pricing fails */
  priceFrom?: number;
  priceCurrency?: string;
  cachedPriceUpdatedAt?: string;
  description?: string;
  amenities?: string[];
  syncedAt?: string;
  updatedAt?: string;
};

export type TripjackHotelDestinationDoc = {
  key: string;
  name: string;
  country: string;
  hids: string[];
  updatedAt?: string;
};

export type RoomGuest = {
  firstName: string;
  lastName?: string;
  type: "adult" | "child";
  age?: number;
};

export type RoomGuestRoom = {
  roomIndex: number;
  guests: RoomGuest[];
};

export type HotelGuestDetails = {
  email: string;
  phone: string;
  countryCode?: string;
  addressLine?: string;
  city?: string;
  state?: string;
  pincode?: string;
  pan?: string;
};

export type HotelBookingDoc = {
  id: string;
  bookingId: string;
  productType: "hotel";
  destinationKey: string;
  tjHotelId: string;
  hotelName: string;
  locality?: string;
  checkIn: string;
  checkOut: string;
  rooms: number;
  adults: number;
  children: number;
  roomName?: string;
  mealBasis?: string;
  totalFare: number;
  currency: string;
  guestDetails: HotelGuestDetails;
  roomGuestRooms: RoomGuestRoom[];
  status: HotelBookingStatus;
  paymentStatus: HotelPaymentStatus;
  tripjackReviewBookingId?: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignatureVerified?: boolean;
  reviewNormalized?: Record<string, unknown>;
  adminNotes?: string;
  supplierConfirmation?: string;
  manualReviewResolved?: boolean;
  createdAt: string;
  updatedAt: string;
};

export type HotelSearchRequest = {
  checkIn: string;
  checkOut: string;
  rooms: number;
  adults: number;
  children?: number;
  childAges?: number[];
};

export type HotelRoomOption = {
  optionId: string;
  roomName: string;
  mealBasis?: string;
  refundable?: boolean;
  cancellationText?: string;
  totalFare: number;
  currency: string;
  raw?: Record<string, unknown>;
};

export type HotelsSiteSettings = {
  enabled: boolean;
  markupPercent?: number;
  updatedAt?: string;
};
