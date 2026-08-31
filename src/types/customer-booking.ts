// Named CustomerBooking* rather than plain Booking so this doesn't collide
// with a future guest-facing booking-creation type — same domain word,
// different consumer (admin viewing existing bookings vs. a guest making one).

import type { BookingPaymentStatus, BookingStatus } from "@/types/booking";

export type CustomerBookingSummary = {
  id: string;
  customerName: string;
  guests: number;
  roomType: string;
  amount: number;
  bedType: string;
  checkIn: string;
  checkOut: string;
  status: BookingStatus;
};

export type CustomerBookingSpecialRequest = {
  label: string;
  price: number;
  quantity: number;
};

export type CustomerBookingDetail = {
  id: string;
  bookingCode: string;
  customerName: string;
  guests: number;
  roomType: string;
  roomTypeId: string | null;
  amount: number;
  bedType: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  bookingDate: string;
  totalAmount: number;
  status: BookingStatus;
  paymentStatus: BookingPaymentStatus;
  roomNos: string[];
  paymentMethod: "credit_card" | "cash";
  cardBrand: string | null;
  cardLast4: string | null;
  roomSubtotal: number;
  standardRequests: string[];
  standardRequestCodes: string[];
  specialRequests: CustomerBookingSpecialRequest[];
  specialRequestSelections: Record<string, number>;
  additionalRequest: string | null;
  promoCode: string | null;
  discountAmount: number;
  paidAmount: number;
  amountDue: number;
};
