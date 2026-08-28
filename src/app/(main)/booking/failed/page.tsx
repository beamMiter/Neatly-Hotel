import { redirect } from "next/navigation";
import { createClient } from "@/server/db/supabase-server";
import { getBookingForCustomerPage } from "@/server/services/booking-access";
import { BookingFailedView } from "@/features/booking/components/BookingFailedView";

type BookingFailedPageProps = {
  searchParams: Promise<{ bookingId?: string }>;
};

export default async function BookingFailedPage({ searchParams }: BookingFailedPageProps) {
  const { bookingId } = await searchParams;
  if (!bookingId) redirect("/search");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const booking = await getBookingForCustomerPage(bookingId, user?.id ?? null);
  if (!booking) redirect("/booking/lookup");

  return (
    <main className="flex-1 bg-[#F7F7FB]">
      <BookingFailedView bookingId={bookingId} booking={booking} />
    </main>
  );
}
