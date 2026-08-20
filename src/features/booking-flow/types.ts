import type { RoomType, SearchQuery } from "@/features/booking/types";

export type BookingStep = 1 | 2 | 3;

export type BookingCustomerProfile = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  country: string;
};

export type BookingBasicInfo = BookingCustomerProfile;

export type BookingSpecialRequests = {
  standardRequests: string[];
  paidAddOns: string[];
  /** Breakfast days, airport legs (`outbound` / `return`), etc. */
  paidAddOnSelections: Record<string, string[]>;
  /** Guest count for per-person add-ons (e.g. breakfast: 1 or 2). */
  paidAddOnGuests: Record<string, number>;
  additionalRequest: string;
};

export type BookingDraft = {
  roomTypeId: string;
  roomTypeName: string;
  pricePerNight: number;
  search: SearchQuery;
  basicInfo: BookingBasicInfo;
  specialRequests: BookingSpecialRequests;
  nights: number;
  roomSubtotal: number;
  addOnsTotal: number;
  totalAmount: number;
  updatedAt: string;
};

export type BookingFlowRoom = Pick<
  RoomType,
  "id" | "name" | "guests" | "discountedPrice" | "fullPrice"
>;

export type BookingPriceSummary = {
  nights: number;
  pricePerNight: number;
  roomSubtotal: number;
  addOns: {
    id: string;
    label: string;
    price: number;
    unitPrice?: number;
    dayCount?: number;
  }[];
  addOnsTotal: number;
  totalAmount: number;
};
