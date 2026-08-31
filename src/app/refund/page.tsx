import { redirect } from "next/navigation";
import { createClient } from "@/server/db/supabase-server";
import { getBookingForCustomerPage } from "@/server/services/booking-access";
import RefundReceiptView from "@/app/refund/RefundReceiptView";

type RefundPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function RefundPage({ searchParams }: RefundPageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // Guests (no session) have no access to /booking-history — send them back
  // to the code+email lookup page instead.
  const fallbackHref = user ? "/booking-history" : "/booking/lookup";

  const params = await searchParams;
  const bookingId = typeof params.bookingId === "string" ? params.bookingId : "";
  if (!bookingId) redirect(fallbackHref);

  let booking;
  try {
    booking = await getBookingForCustomerPage(bookingId, user?.id ?? null);
  } catch (error) {
    console.error("[refund] Failed to load booking:", error);
    redirect(fallbackHref);
  }
  if (!booking || booking.status !== "refunded") redirect(fallbackHref);

  return (
    <RefundReceiptView
      roomName={booking.roomTypeName}
      checkIn={booking.checkIn}
      checkOut={booking.checkOut}
      guests={booking.guests}
      refundAmount={booking.totalAmount}
      backHref={fallbackHref}
    />
  );
}
