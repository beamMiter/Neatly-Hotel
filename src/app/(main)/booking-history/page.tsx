import type { Metadata } from "next";
import { BookingHistoryView } from "@/features/booking-history/components/BookingHistoryView";

export const metadata: Metadata = {
  title: "Booking History | Neatly Hotel",
  description: "View and manage your bookings at Neatly Hotel",
};

export default function BookingHistoryPage() {
  return <BookingHistoryView />;
}
