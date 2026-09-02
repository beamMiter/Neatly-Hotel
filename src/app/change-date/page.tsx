import { redirect } from "next/navigation";
import { createClient } from "@/server/db/supabase-server";
import { getBookingForCustomerPage } from "@/server/services/booking-access";
import { getGuestRoomTypeById } from "@/server/queries/booking-search.query";
import ChangeDateView from "@/app/change-date/ChangeDateView";

type ChangeDatePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ChangeDatePage({ searchParams }: ChangeDatePageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // Guests (no session) have no access to /booking-history — send them back
  // to the code+email lookup page instead, both here and after a successful save.
  const fallbackHref = user ? "/booking-history" : "/booking/lookup";

  const params = await searchParams;
  const bookingId = typeof params.bookingId === "string" ? params.bookingId : "";
  if (!bookingId) redirect(fallbackHref);

  let booking;
  try {
    booking = await getBookingForCustomerPage(bookingId, user?.id ?? null);
  } catch (error) {
    console.error("[change-date] Failed to load booking:", error);
    redirect(fallbackHref);
  }
  if (!booking) redirect(fallbackHref);

  const room = await getGuestRoomTypeById(booking.roomTypeId);

  return (
    <ChangeDateView
      bookingId={booking.id}
      roomName={booking.roomTypeName}
      roomImageUrl={room?.imageUrls[0] ?? "/images/room-bg-preview/Superior.jpg"}
      bookingCreatedAt={booking.createdAt}
      checkIn={booking.checkIn}
      checkOut={booking.checkOut}
      successHref={fallbackHref}
    />
  );
}
