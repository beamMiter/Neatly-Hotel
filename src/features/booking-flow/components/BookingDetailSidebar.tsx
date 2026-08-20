import { format } from "date-fns";
import Image from "next/image";
import { BOOKING_POLICY_NOTES } from "@/features/booking-flow/constants";
import { BookingHoldTimer } from "@/features/booking-flow/components/BookingHoldTimer";
import type { SearchQuery } from "@/features/booking/types";
import type { BookingFlowRoom, BookingPriceSummary, BookingStep } from "@/features/booking-flow/types";

type BookingDetailSidebarProps = {
  room: BookingFlowRoom;
  search: SearchQuery;
  pricing: BookingPriceSummary;
  currentStep: BookingStep;
  availabilityError?: string | null;
};

function formatAmount(amount: number) {
  return amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatStayRange(checkIn: string, checkOut: string) {
  const start = new Date(`${checkIn}T00:00:00`);
  const end = new Date(`${checkOut}T00:00:00`);
  return `${format(start, "EEE, dd MMM yyyy")} - ${format(end, "EEE, dd MMM yyyy")}`;
}

export function BookingDetailSidebar({
  room,
  search,
  pricing,
  currentStep,
  availabilityError,
}: BookingDetailSidebarProps) {
  return (
    <aside className="flex flex-col gap-4 lg:sticky lg:top-8 lg:self-start">
      <div className="overflow-hidden rounded-lg">
        <div className="flex items-center justify-between bg-[#465C4F] px-5 py-4">
          <div className="flex items-center gap-2.5">
            <Image src="/icons/icon/cart.svg" alt="" width={20} height={20} className="brightness-0 invert" />
            <span className="text-base font-semibold text-white">Booking Detail</span>
          </div>
          <BookingHoldTimer />
        </div>

        <div className="bg-[#3D4F44] px-5 py-5 text-white">
          <div className="space-y-1 text-sm text-white/80">
            <p>Check-in: After 2:00 PM</p>
            <p>Check-out: Before 12:00 PM</p>
          </div>

          <p className="mt-4 text-sm text-white/90">{formatStayRange(search.checkIn, search.checkOut)}</p>
          <p className="mt-2 text-sm text-white/90">
            {search.guests} Guest{search.guests === 1 ? "" : "s"}
          </p>

          <div className="mt-5 flex items-start justify-between gap-4 border-t border-white/15 pt-5 text-sm">
            <span className="text-white/90">{room.name}</span>
            <span className="shrink-0 font-medium text-white">{formatAmount(pricing.roomSubtotal)}</span>
          </div>

          {pricing.addOns.map((addOn) => (
            <div key={addOn.id} className="mt-3 flex items-start justify-between gap-4 text-sm">
              <span className="text-white/80">{addOn.label}</span>
              <span className="shrink-0 font-medium text-white">{formatAmount(addOn.price)}</span>
            </div>
          ))}

          <div className="mt-5 flex items-center justify-between border-t border-white/15 pt-5">
            <span className="text-base font-semibold text-white">Total</span>
            <span className="text-xl font-semibold text-white">THB {formatAmount(pricing.totalAmount)}</span>
          </div>
        </div>
      </div>

      {availabilityError && currentStep === 1 && (
        <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{availabilityError}</p>
      )}

      <div className="rounded-lg bg-[#E4E7EE] px-5 py-5">
        <ul className="space-y-3 text-sm leading-6 text-[#646D89]">
          {BOOKING_POLICY_NOTES.map((note) => (
            <li key={note} className="flex gap-2">
              <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#9AA1B9]" />
              <span>{note}</span>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
