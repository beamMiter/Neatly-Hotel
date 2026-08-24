// Cross-query-boundary types for src/server/queries/bookings.query.ts,
// promo.query.ts, and special-requests.query.ts.

import type { AddOnBillingType } from "@/lib/addon-pricing";

export type BookingGuestInfo = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string; // ISO date
  country: string;
};

export type SpecialRequestOption = {
  code: string;
  label: string;
  category: "standard" | "special";
  price: number;
  // How the item is priced — see src/lib/addon-pricing.ts. Standard
  // requests are free and always "per_stay" (the value is irrelevant since
  // price is 0, but every row has a real one so the UI doesn't need to
  // special-case category).
  billingType: AddOnBillingType;
};

// A chosen add-on with the final priced multiplier. `price` is the per-unit
// catalog price at booking time (snapshotted, so later catalog edits don't
// rewrite past bookings); the line total is price × quantity. `quantity` is
// always server-computed from billingType + nights — never trust a client
// number here (see resolveAddOnQuantity).
export type SelectedSpecialRequest = {
  code: string;
  label: string;
  price: number;
  quantity: number;
};

// What the client is allowed to send: a code, and — only for per_leg
// (legs chosen) / per_day_guest (guest count) — a 1-or-2 count. Ignored for
// every other billing type, which the server prices from nights alone.
export type SpecialRequestSelection = {
  code: string;
  count?: number;
};

export type CreateBookingInput = {
  customerId: string;
  roomTypeId: string;
  checkIn: string; // ISO date
  checkOut: string; // ISO date
  guests: number;
  rooms: number;
  guestInfo: BookingGuestInfo;
  standardRequests: string[]; // codes only, free
  specialRequests: SpecialRequestSelection[]; // codes + counts, priced server-side
  additionalRequest: string | null;
  promoCode: string | null;
  paymentMethod: "credit_card" | "cash";
};

export type BookingPricing = {
  nights: number;
  roomSubtotal: number;
  addonsTotal: number;
  discountAmount: number;
  totalAmount: number;
};

export type BookingStatus = "pending_payment" | "confirmed" | "cancelled";
export type BookingPaymentStatus = "pending" | "paid" | "failed" | "pay_at_hotel";

export type BookingRecord = {
  id: string;
  bookingCode: string;
  status: BookingStatus;
  paymentStatus: BookingPaymentStatus;
  paymentMethod: "credit_card" | "cash";
  checkIn: string;
  checkOut: string;
  guests: number;
  totalAmount: number;
  roomTypeId: string;
  roomTypeName: string;
  rooms: number;
  guestInfo: BookingGuestInfo;
  standardRequests: string[];
  specialRequests: SelectedSpecialRequest[];
  additionalRequest: string | null;
  promoCode: string | null;
  discountAmount: number;
  cardBrand: string | null;
  cardLast4: string | null;
  createdAt: string;
};

export type ProfilePrefill = {
  firstName: string;
  lastName: string;
  phone: string;
  dateOfBirth: string;
  country: string;
  email: string; // from auth.users, not profiles
};

export type CreateBookingResult =
  | { ok: true; booking: BookingRecord; pricing: BookingPricing; clientSecret: string | null }
  | { ok: false; code: "SOLD_OUT" | "INVALID_PROMO" | "INVALID_DATES" | "AMOUNT_TOO_LOW"; message: string };
