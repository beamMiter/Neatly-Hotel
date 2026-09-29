import type { Metadata } from "next";
import { Suspense } from "react";
import { BookingLookupView } from "@/features/booking/components/BookingLookupView";

export const metadata: Metadata = {
  title: "Find Booking | Neatly Hotel",
  description: "Look up your Neatly Hotel booking with booking code and email",
};

export default function BookingLookupPage() {
  return (
    <main className="flex-1 bg-[#F7F7FB]">
      <Suspense fallback={<div className="px-4 py-16 text-center text-sm text-[#646D89]">Loading…</div>}>
        <BookingLookupView />
      </Suspense>
    </main>
  );
}
