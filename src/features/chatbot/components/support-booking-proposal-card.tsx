"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GuestBookingAlertDialog } from "@/components/shared/GuestBookingAlertDialog";
import { buildBookingHref } from "@/features/booking-flow/utils";
import type { SupportBookingProposal } from "@/types/live-support";

export function SupportBookingProposalCard({
  proposal,
  isLoggedIn,
  onGuestBookingDialogChange,
}: {
  proposal: SupportBookingProposal;
  isLoggedIn: boolean;
  onGuestBookingDialogChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [isGuestDialogOpen, setIsGuestDialogOpen] = useState(false);
  const bookingHref = `${buildBookingHref(proposal.roomTypeId, {
    checkIn: proposal.checkIn,
    checkOut: proposal.checkOut,
    guests: proposal.guests,
    rooms: proposal.rooms,
  })}&source=live-support`;

  function continueToBooking() {
    if (isLoggedIn) {
      router.push(bookingHref);
      return;
    }
    setIsGuestDialogOpen(true);
    onGuestBookingDialogChange(true);
  }

  function closeGuestDialog() {
    setIsGuestDialogOpen(false);
    onGuestBookingDialogChange(false);
  }

  function continueAsGuest() {
    closeGuestDialog();
    router.push(bookingHref);
  }

  return (
    <>
      <article className="w-full shrink-0 overflow-hidden rounded-xl border border-[#E7C6BA] bg-white shadow-[0_5px_18px_rgba(91,60,48,.1)]">
        <div className="bg-[#FFF1EB] px-4 py-3">
          <p className="m-0 text-xs font-semibold uppercase tracking-[.08em] text-[#A84A25]">Booking proposal</p>
          <h3 className="m-0 mt-0.5 text-base font-semibold text-[#2A2E3F]">{proposal.roomName}</h3>
        </div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 px-4 py-4 text-sm">
          <div><dt className="text-xs text-[#8A91A7]">Check-in</dt><dd className="m-0 mt-0.5 font-medium text-[#2A2E3F]">{proposal.checkIn}</dd></div>
          <div><dt className="text-xs text-[#8A91A7]">Check-out</dt><dd className="m-0 mt-0.5 font-medium text-[#2A2E3F]">{proposal.checkOut}</dd></div>
          <div><dt className="text-xs text-[#8A91A7]">Rooms</dt><dd className="m-0 mt-0.5 font-medium text-[#2A2E3F]">{proposal.rooms}</dd></div>
          <div><dt className="text-xs text-[#8A91A7]">Guests</dt><dd className="m-0 mt-0.5 font-medium text-[#2A2E3F]">{proposal.guests}</dd></div>
          <div className="col-span-2 flex items-end justify-between border-t border-[#EEF0F4] pt-3"><dt className="text-sm font-medium text-[#646D89]">Price per night</dt><dd className="m-0 text-base font-semibold text-[#C14817]">THB {proposal.pricePerNight.toLocaleString("en-US", { minimumFractionDigits: 2 })}</dd></div>
        </dl>
        <div className="border-t border-[#EEF0F4] p-3">
          <button type="button" onClick={continueToBooking} className="flex w-full items-center justify-center rounded-lg bg-[#C14817] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#A93F13] focus:outline-2 focus:outline-offset-2 focus:outline-[#C14817]">Confirm booking</button>
          <p className="mt-2 text-center text-[11px] leading-4 text-[#8A91A7]">Availability is checked again before the booking is created.</p>
        </div>
      </article>
      <GuestBookingAlertDialog
        open={isGuestDialogOpen}
        onClose={closeGuestDialog}
        onContinueAsGuest={continueAsGuest}
        loginHref={`/login?redirectTo=${encodeURIComponent(bookingHref)}`}
      />
    </>
  );
}
