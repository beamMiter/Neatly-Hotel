import { redirect } from "next/navigation";
import { createClient } from "@/server/db/supabase-server";
import { getBookingForCustomerPage } from "@/server/services/booking-access";
import { CANCELLABLE_STATUSES } from "@/server/queries/bookings.query";
import { getGuestRoomTypeById } from "@/server/queries/booking-search.query";
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
  if (!booking) redirect(fallbackHref);

  // Already resolved (e.g. revisiting the link later — cancelled and
  // refunded are both terminal outcomes of the same action, cash bookings
  // land on "cancelled" even when they got here via the refund-eligible
  // path): show the matching receipt directly. Still cancellable: show the
  // confirm step. Anything else (checked in, completed) doesn't belong on
  // this page.
  const initialPhase =
    booking.status === "cancelled" || booking.status === "refunded"
      ? "success"
      : CANCELLABLE_STATUSES.includes(booking.status)
        ? "confirm"
        : null;
  if (!initialPhase) redirect(fallbackHref);

  const room = await getGuestRoomTypeById(booking.roomTypeId);

  return (
    <RefundReceiptView
      bookingId={booking.id}
      roomName={booking.roomTypeName}
      imageUrl={room?.imageUrls[0] ?? "/images/room-bg-preview/Superior.jpg"}
      bookingCreatedAt={booking.createdAt}
      checkIn={booking.checkIn}
      checkOut={booking.checkOut}
      guests={booking.guests}
      totalAmount={booking.totalAmount}
      initialPhase={initialPhase}
      initialRefunded={booking.status === "refunded"}
    />
  );
}
