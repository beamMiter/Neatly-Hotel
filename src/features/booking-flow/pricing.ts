import { nightsBetween } from "@/features/booking/date-rules";
import { AIRPORT_TRANSFER_LEGS, BREAKFAST_ADD_ON_ID, getPaidAddOnOption, PAID_ADD_ON_OPTIONS } from "@/features/booking-flow/constants";
import type { BookingPriceSummary, BookingSpecialRequests } from "@/features/booking-flow/types";

function legLabel(legId: string) {
  return AIRPORT_TRANSFER_LEGS.find((leg) => leg.id === legId)?.label ?? legId;
}

function breakfastGuestCount(specialRequests: Pick<BookingSpecialRequests, "paidAddOnGuests">): number {
  const guests = specialRequests.paidAddOnGuests[BREAKFAST_ADD_ON_ID];
  return guests === 1 || guests === 2 ? guests : 1;
}

export function calculateBookingPrice(input: {
  checkIn: string;
  checkOut: string;
  rooms: number;
  pricePerNight: number;
  specialRequests: Pick<BookingSpecialRequests, "paidAddOns" | "paidAddOnSelections" | "paidAddOnGuests">;
}): BookingPriceSummary {
  const nights = nightsBetween(input.checkIn, input.checkOut);
  const roomSubtotal = input.pricePerNight * nights * input.rooms;

  const addOns = input.specialRequests.paidAddOns.flatMap((id) => {
    const option = getPaidAddOnOption(id);
    if (!option) return [];

    if (option.billing === "per_day") {
      const selectedDays = input.specialRequests.paidAddOnSelections[id] ?? [];
      const dayCount = selectedDays.length;
      if (dayCount === 0) return [];

      const isBreakfast = id === BREAKFAST_ADD_ON_ID;
      const guestCount = isBreakfast ? breakfastGuestCount(input.specialRequests) : 1;
      const total = option.price * dayCount * guestCount;

      let label = option.label;
      if (isBreakfast) {
        const parts: string[] = [];
        if (dayCount > 1) parts.push(`${dayCount} days`);
        if (guestCount > 1) parts.push(`${guestCount} guests`);
        if (parts.length > 0) label = `${option.label} (${parts.join(", ")})`;
      } else if (dayCount > 1) {
        label = `${option.label} (${dayCount} days)`;
      }

      return [
        {
          id: option.id,
          label,
          price: total,
          unitPrice: option.price,
          dayCount,
        },
      ];
    }

    if (option.billing === "per_night") {
      if (nights === 0) return [];

      return [
        {
          id: option.id,
          label: nights > 1 ? `${option.label} (${nights} nights)` : option.label,
          price: option.price * nights,
          unitPrice: option.price,
          dayCount: nights,
        },
      ];
    }

    if (option.billing === "per_leg") {
      const legs = input.specialRequests.paidAddOnSelections[id] ?? [];
      if (legs.length === 0) return [];

      if (legs.length === 1) {
        return [
          {
            id: option.id,
            label: `${option.label} — ${legLabel(legs[0])}`,
            price: option.price,
          },
        ];
      }

      return legs.map((legId) => ({
        id: `${option.id}_${legId}`,
        label: `${option.label} — ${legLabel(legId)}`,
        price: option.price,
      }));
    }

    return [
      {
        id: option.id,
        label: option.label,
        price: option.price,
      },
    ];
  });

  const addOnsTotal = addOns.reduce((sum, addOn) => sum + addOn.price, 0);

  return {
    nights,
    pricePerNight: input.pricePerNight,
    roomSubtotal,
    addOns,
    addOnsTotal,
    totalAmount: roomSubtotal + addOnsTotal,
  };
}

export function validateSpecialRequests(
  specialRequests: BookingSpecialRequests,
): string | null {
  for (const id of specialRequests.paidAddOns) {
    const option = PAID_ADD_ON_OPTIONS.find((item) => item.id === id);
    if (!option) continue;

    if (option.billing === "per_day" && id === BREAKFAST_ADD_ON_ID) {
      const selectedDays = specialRequests.paidAddOnSelections[id] ?? [];
      if (selectedDays.length === 0) {
        return `Please select at least one day for ${option.label.toLowerCase()}.`;
      }
      const guests = specialRequests.paidAddOnGuests[id];
      if (guests !== 1 && guests !== 2) {
        return "Please select the number of breakfast guests (1 or 2).";
      }
      continue;
    }

    if (option.billing === "per_day") {
      const selectedDays = specialRequests.paidAddOnSelections[id] ?? [];
      if (selectedDays.length === 0) {
        return `Please select at least one day for ${option.label.toLowerCase()}.`;
      }
    }

    if (option.billing === "per_leg") {
      const legs = specialRequests.paidAddOnSelections[id] ?? [];
      if (legs.length === 0) {
        return "Please select at least one airport transfer leg.";
      }
    }
  }

  return null;
}
