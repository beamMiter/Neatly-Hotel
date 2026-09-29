export const DEFAULT_HOTEL_ID = "default";

export const DEFAULT_HOTEL_INFORMATION = {
  id: DEFAULT_HOTEL_ID,
  name: "Neatly Hotel",
  description:
    "Set in Bangkok, Thailand. Neatly Hotel offers 5-star accommodation with an outdoor pool, kids' club, sports facilities and a fitness centre. There is also a spa, an indoor pool and saunas. All units at the hotel are equipped with a seating area, a flat-screen TV with satellite channels, a dining area and a private bathroom with free toiletries, a hairdryer and shower. Every room at Neatly Hotel offers air conditioning and a desk.",
  logoUrl: "/images/logo-neatly.svg",
  // "HH:mm", 24-hour — matches the chatbot FAQ's stated policy
  // (faq-manager.tsx's "check-times" entry) so both stay consistent.
  checkInTime: "14:00",
  checkOutTime: "12:00",
};

export type HotelInformation = {
  id: string;
  name: string;
  description: string;
  logoUrl: string | null;
  checkInTime: string;
  checkOutTime: string;
};

// "14:00" -> "2:00 PM". Pure string math, deliberately not a Date — avoids
// timezone parsing entirely for a value that's just a wall-clock time.
export function formatCheckTimeLabel(time: string | null | undefined): string {
  const [hours, minutes] = (time ?? "").split(":").map(Number);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return time ?? "";
  const period = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${String(minutes).padStart(2, "0")} ${period}`;
}
