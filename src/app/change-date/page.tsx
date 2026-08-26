import { redirect } from "next/navigation";
import { createClient } from "@/server/db/supabase-server";
import { getBookingById } from "@/server/queries/bookings.query";
import { getGuestRoomTypeById } from "@/server/queries/booking-search.query";
import ChangeDateView from "@/app/change-date/ChangeDateView";

type ChangeDatePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ChangeDatePage({ searchParams }: ChangeDatePageProps) {
  const params = await searchParams;
  const bookingId = typeof params.bookingId === "string" ? params.bookingId : "";
  if (!bookingId) redirect("/booking-history");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const booking = await getBookingById(bookingId, user?.id ?? null);
  if (!booking) redirect("/booking-history");

  const room = await getGuestRoomTypeById(booking.roomTypeId);

  return (
    <ChangeDateView
      bookingId={booking.id}
      roomName={booking.roomTypeName}
      roomImageUrl={room?.imageUrls[0] ?? "/images/room-bg-preview/Superior.jpg"}
      bookingCreatedAt={booking.createdAt}
      checkIn={booking.checkIn}
      checkOut={booking.checkOut}
    />
  );
}
