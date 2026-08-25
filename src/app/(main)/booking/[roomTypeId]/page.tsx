import { notFound } from "next/navigation";
import { createClient } from "@/server/db/supabase-server";
import { getGuestRoomTypeById } from "@/server/queries/booking-search.query";
import { getSpecialRequestCatalogForDisplay } from "@/server/queries/special-requests.query";
import { getProfileForBookingPrefill } from "@/server/queries/profiles.query";
import { loadHotelInformation } from "@/server/queries/hotel.query";
import { formatCheckTimeLabel } from "@/types/hotel";
import { validateStayDates } from "@/features/booking/date-rules";
import { BookingWizard } from "@/features/booking/components/BookingWizard";
import { UUID_PATTERN } from "@/lib/validation-patterns";

// This is now the one canonical booking entry point (the old /booking-room
// was retired once this landed — same wizard, just moved to this URL shape,
// which is what the team's booking-flow branch already links to from
// RoomDetail/RoomCard: `buildBookingHref` in
// src/features/booking-flow/utils.ts on dev,
// `/booking/[roomTypeId]?checkIn=&checkOut=&guests=&rooms=`). Their payment
// step was still a placeholder with no real Stripe wired in, so this exists
// to make that entry point actually work rather than rebuilding their whole
// step-by-step UI in parallel. See the Booking Flow Reconciliation doc for
// the fuller comparison.
type BookingFlowPageProps = {
  params: Promise<{ roomTypeId: string }>;
  searchParams: Promise<{
    checkIn?: string;
    checkOut?: string;
    guests?: string;
    rooms?: string;
  }>;
};

export default async function BookingFlowPage({ params, searchParams }: BookingFlowPageProps) {
  const { roomTypeId } = await params;
  const query = await searchParams;

  if (!UUID_PATTERN.test(roomTypeId)) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const checkIn = query.checkIn ?? "";
  const checkOut = query.checkOut ?? "";
  if (validateStayDates(checkIn, checkOut)) notFound();

  const guests = Math.max(1, Math.min(8, Number(query.guests) || 1));
  const rooms = Math.max(1, Math.min(3, Number(query.rooms) || 1));

  const [room, specialRequestCatalog, hotel, prefill] = await Promise.all([
    getGuestRoomTypeById(roomTypeId),
    getSpecialRequestCatalogForDisplay(),
    loadHotelInformation(),
    user ? getProfileForBookingPrefill(user.id) : Promise.resolve(null),
  ]);

  if (!room) notFound();

  return (
    <main className="flex-1 bg-[#F7F7FB]">
      <BookingWizard
        roomTypeId={room.id}
        roomName={room.name}
        pricePerNight={room.discountedPrice}
        checkIn={checkIn}
        checkOut={checkOut}
        guests={guests}
        rooms={rooms}
        specialRequestCatalog={specialRequestCatalog}
        prefill={prefill}
        checkInTimeLabel={formatCheckTimeLabel(hotel.checkInTime)}
        checkOutTimeLabel={formatCheckTimeLabel(hotel.checkOutTime)}
      />
    </main>
  );
}
