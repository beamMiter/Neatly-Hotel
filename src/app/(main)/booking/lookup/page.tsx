import type { Metadata } from "next";
import { BookingLookupView } from "@/features/booking/components/BookingLookupView";

export const metadata: Metadata = {
  title: "Find Booking | Neatly Hotel",
  description: "Look up your Neatly Hotel booking with booking code and email",
};

export default function BookingLookupPage() {
  return (
    <main className="flex-1 bg-[#F7F7FB]">
      <BookingLookupView />
    </main>
  );
}
