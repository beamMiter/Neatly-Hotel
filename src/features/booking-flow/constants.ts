export type StandardRequestOption = {
  id: string;
  label: string;
};

export type AddOnBilling = "per_stay" | "per_night" | "per_day" | "per_leg";

export type PaidAddOnOption = {
  id: string;
  label: string;
  price: number;
  billing: AddOnBilling;
};

export const AIRPORT_TRANSFER_LEGS = [
  { id: "outbound", label: "Outbound (Airport → Hotel)" },
  { id: "return", label: "Return (Hotel → Airport)" },
] as const;

export type AirportTransferLeg = (typeof AIRPORT_TRANSFER_LEGS)[number]["id"];

export const STANDARD_REQUEST_OPTIONS: StandardRequestOption[] = [
  { id: "early_checkin", label: "Early check-in" },
  { id: "late_checkout", label: "Late check-out" },
  { id: "non_smoking", label: "Non-smoking room" },
  { id: "high_floor", label: "A room on the high floor" },
  { id: "quiet_room", label: "A quiet room" },
];

export const PAID_ADD_ON_OPTIONS: PaidAddOnOption[] = [
  { id: "baby_cot", label: "Baby cot", price: 400, billing: "per_stay" },
  { id: "airport_transfer", label: "Airport transfer", price: 200, billing: "per_leg" },
  { id: "extra_bed", label: "Extra bed", price: 500, billing: "per_night" },
  { id: "extra_pillows", label: "Extra pillows", price: 100, billing: "per_night" },
  { id: "phone_chargers", label: "Phone chargers and adapters", price: 100, billing: "per_stay" },
  { id: "breakfast", label: "Breakfast", price: 150, billing: "per_day" },
];

export const BREAKFAST_ADD_ON_ID = "breakfast";
export const BREAKFAST_GUEST_OPTIONS = [1, 2] as const;

export const BOOKING_DRAFT_STORAGE_KEY = "neatly-booking-draft";

export const BOOKING_POLICY_NOTES = [
  "Cancelation made before 24 hours of check-in date: Full refund",
  "Able to change check-in and check-out date with in 24 hours of booking date",
];

export function getPaidAddOnOption(id: string): PaidAddOnOption | undefined {
  return PAID_ADD_ON_OPTIONS.find((option) => option.id === id);
}
