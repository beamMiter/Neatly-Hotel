import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/server/db/supabase-server";
import { getStaffRole } from "@/server/queries/staff-members.query";
import { getBookingsForCustomer } from "@/server/queries/booking-history.query";
import { createMockBookingHistory } from "@/data/booking-history";
import { BookingHistoryView } from "@/features/booking-history/components/BookingHistoryView";

export const metadata: Metadata = {
  title: "Booking History | Neatly Hotel",
  description: "View and manage your bookings at Neatly Hotel",
};

export default async function BookingHistoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirectTo=%2Fbooking-history");

  // TODO(booking-history): staff seeing mock data is a temporary stand-in
  // for local dev, where the shared `bookings` table isn't reachable from
  // NEXT_PUBLIC_SUPABASE_URL — drop this branch once real customer data is
  // verified end-to-end and this no longer needs a fallback to eyeball.
  const staffRole = await getStaffRole(user.id);
  const bookings = staffRole ? createMockBookingHistory() : await getBookingsForCustomer(user.id);

  return <BookingHistoryView bookings={bookings} />;
}
