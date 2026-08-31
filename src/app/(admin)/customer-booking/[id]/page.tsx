import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCustomerBookingById } from "@/server/queries/customer-bookings.query";
import { getSpecialRequestCatalogForDisplay } from "@/server/queries/special-requests.query";
import { BookingDetailView } from "@/features/customer-booking/components/BookingDetailView";

export const metadata: Metadata = {
  title: "Booking Detail | Customer Booking | Neatly Hotel Admin",
};

export default async function CustomerBookingDetailPage(props: PageProps<"/customer-booking/[id]">) {
  const { id } = await props.params;
  const [booking, specialRequestCatalog] = await Promise.all([
    getCustomerBookingById(id),
    getSpecialRequestCatalogForDisplay(),
  ]);

  if (!booking) {
    notFound();
  }

  return <BookingDetailView booking={booking} specialRequestCatalog={specialRequestCatalog} />;
}
