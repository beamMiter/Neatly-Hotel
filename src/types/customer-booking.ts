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

export type CustomerBookingDetail = {
  id: string;
  bookingCode: string;
  customerName: string;
  guests: number;
  roomType: string;
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
};
