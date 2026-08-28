import { redirect } from "next/navigation";
import { createClient } from "@/server/db/supabase-server";
import { getBookingForCustomerPage } from "@/server/services/booking-access";
import RefundReceiptView from "@/app/refund/RefundReceiptView";

type RefundPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function RefundPage({ searchParams }: RefundPageProps) {
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
    console.error("[refund] Failed to load booking:", error);
    redirect("/booking-history");
  }
  if (!booking || booking.status !== "refunded") redirect("/booking-history");

  return (
    <RefundReceiptView
      roomName={booking.roomTypeName}
      checkIn={booking.checkIn}
      checkOut={booking.checkOut}
      guests={booking.guests}
      refundAmount={booking.totalAmount}
    />
  );
}
