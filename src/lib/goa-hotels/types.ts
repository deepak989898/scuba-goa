/** Goa hotel catalog from Safar Sathi `goaHotels` collection (read-only). */

export const GOA_HOTELS_COLLECTION = "goaHotels";
export const GOA_HOTEL_BOOKINGS_COLLECTION = "goaHotelBookings";

export type GoaHotelRoom = {
  id: string;
  name: string;
  type: string;
  mealBasis: string;
  mealBasisLabel: string;
  pricePerNight: number;
  totalPrice: number;
  basePrice: number;
  taxes: number;
  currency: string;
  maxGuests: number;
  available: boolean;
  isRefundable: boolean;
  inclusions: string[];
  images: string[];
};

export type GoaHotelDoc = {
  id: string;
  tjHotelId: number;
  name: string;
  slug: string;
  cityName: string;
  cityKey: string;
  locality?: string;
  location: string;
  address: string;
  description: string;
  facilities: string[];
  policies: string[];
  starRating: number | null;
  heroImage?: string;
  imageUrls: string[];
  images: string[];
  priceFrom: number;
  currency: string;
  rooms: GoaHotelRoom[];
  lastPricedAt?: string;
  contentSynced: boolean;
  websiteVisible: boolean;
  isDeleted: boolean;
  source?: string;
  sharedFor?: string;
  updatedAt?: string;
};

export type GoaHotelBookingStatus = "paid" | "payment_failed" | "cancelled" | "confirmed";

export type GoaHotelBookingDoc = {
  bookingId: string;
  hotelId: string;
  hotelSlug: string;
  hotelName: string;
  hotelLocality?: string;
  roomId: string;
  roomName: string;
  mealBasisLabel?: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  adults: number;
  children: number;
  guestName: string;
  email: string;
  phone: string;
  amountPaise: number;
  totalAmountInr: number;
  currency: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  status: GoaHotelBookingStatus;
  adminNotes?: string;
  emailSent?: boolean;
  adminEmailSent?: boolean;
  createdAt: string;
  updatedAt?: string;
};

export type HotelBookingDraft = {
  hotelId: string;
  hotelSlug: string;
  hotelName: string;
  roomId: string;
  roomName: string;
  mealBasisLabel?: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  adults: number;
  children: number;
  pricePerNight: number;
  totalAmountInr: number;
};
