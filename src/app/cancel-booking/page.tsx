import { redirect } from "next/navigation";
import { createClient } from "@/server/db/supabase-server";
import { getBookingForCustomerPage } from "@/server/services/booking-access";
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

  let booking;
  try {
    booking = await getBookingForCustomerPage(bookingId, user?.id ?? null);
  } catch (error) {
    console.error("[cancel-booking] Failed to load booking:", error);
    redirect("/booking-history");
  }
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
