import type { BookingPaymentStatus, BookingStatus, SelectedSpecialRequest } from "@/types/booking";

export type AdminBookingEditPaymentMethod = "credit_card" | "cash";

export type AdminEditSpecialRequestsInput = {
  standardRequests: string[];
  specialRequests: Array<{ code: string; count?: number }>;
  additionalRequest: string | null;
  paymentMethod?: AdminBookingEditPaymentMethod;
};

export type AdminEditDatesInput = {
  checkIn: string;
  checkOut: string;
  paymentMethod?: AdminBookingEditPaymentMethod;
};

export type AdminUpgradeRoomInput = {
  roomTypeId: string;
  paymentMethod?: AdminBookingEditPaymentMethod;
};

export type AdminBookingEditPricing = {
  roomSubtotal: number;
  addonsTotal: number;
  discountAmount: number;
  totalAmount: number;
  nights: number;
};

export type AdminBookingEditPricingDelta = {
  previousTotal: number;
  nextTotal: number;
  difference: number;
};

export type AdminEditPaymentRequirement =
  | { requiresPayment: false }
  | {
      requiresPayment: true;
      amount: number;
      channel: "stripe" | "pay_at_hotel";
      paymentStatus: BookingPaymentStatus;
    };

export type AdminBookingEditSnapshot = {
  status: BookingStatus;
  checkIn: string;
  checkOut: string;
  totalAmount: number;
  roomSubtotal: number;
  standardRequests: string[];
  specialRequests: SelectedSpecialRequest[];
  additionalRequest: string | null;
  discountAmount: number;
  promoCode: string | null;
};
