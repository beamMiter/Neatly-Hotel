import { redirect } from "next/navigation";
import { createClient } from "@/server/db/supabase-server";
import { getBookingById } from "@/server/queries/bookings.query";
import CancelBookingReceiptView from "@/app/cancel-booking/CancelBookingReceiptView";

type CancelBookingPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CancelBookingPage({ searchParams }: CancelBookingPageProps) {
  const params = await searchParams;
  const bookingId = typeof params.bookingId === "string" ? params.bookingId : "";
  if (!bookingId) redirect("/booking-history");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const booking = await getBookingById(bookingId, user?.id ?? null);
  if (!booking || booking.status !== "cancelled") redirect("/booking-history");

  return (
    <CancelBookingReceiptView
      roomName={booking.roomTypeName}
      checkIn={booking.checkIn}
      checkOut={booking.checkOut}
      guests={booking.guests}
    />
  );
}
