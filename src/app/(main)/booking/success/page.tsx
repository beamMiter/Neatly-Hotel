import { redirect } from "next/navigation";
import { createClient } from "@/server/db/supabase-server";
import { getBookingForCustomerPage } from "@/server/services/booking-access";
import { loadHotelInformation } from "@/server/queries/hotel.query";
import { formatCheckTimeLabel } from "@/types/hotel";
import { BookingSuccessView } from "@/features/booking/components/BookingSuccessView";

type BookingSuccessPageProps = {
  searchParams: Promise<{ bookingId?: string }>;
};

export default async function BookingSuccessPage({ searchParams }: BookingSuccessPageProps) {
  const { bookingId } = await searchParams;
  if (!bookingId) redirect("/search");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [booking, hotel] = await Promise.all([
    getBookingForCustomerPage(bookingId, user?.id ?? null),
    loadHotelInformation(),
  ]);
  if (!booking) redirect("/booking/lookup");

  return (
    <main className="flex-1 bg-[#F7F7FB]">
      <BookingSuccessView
        bookingId={bookingId}
        initialBooking={booking}
        checkInTimeLabel={formatCheckTimeLabel(hotel.checkInTime)}
        checkOutTimeLabel={formatCheckTimeLabel(hotel.checkOutTime)}
        isLoggedIn={Boolean(user)}
      />
    </main>
  );
}
