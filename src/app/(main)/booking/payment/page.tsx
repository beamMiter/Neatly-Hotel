import { redirect } from "next/navigation";
import { BookingPaymentView } from "@/features/booking/components/BookingPaymentView";
import { createClient } from "@/server/db/supabase-server";
import { getBookingForCustomerPage } from "@/server/services/booking-access";

type BookingPaymentPageProps = {
  searchParams: Promise<{ bookingId?: string }>;
};

export default async function BookingPaymentPage({ searchParams }: BookingPaymentPageProps) {
  const { bookingId } = await searchParams;
  if (!bookingId) redirect("/booking/lookup");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const booking = await getBookingForCustomerPage(bookingId, user?.id ?? null);
  if (!booking) redirect("/booking/lookup");

  return (
    <main className="flex-1 bg-[#F7F7FB]">
      <BookingPaymentView bookingId={bookingId} booking={booking} />
    </main>
  );
}
