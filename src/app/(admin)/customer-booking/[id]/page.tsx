import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isAdminBookingEditable } from "@/lib/admin-booking-edit";
import { getCustomerBookingById } from "@/server/queries/customer-bookings.query";
import { getAdminRoomUpgradeOptions } from "@/server/queries/admin-booking-edit.query";
import { getSpecialRequestCatalogForDisplay } from "@/server/queries/special-requests.query";
import { BookingDetailView } from "@/features/customer-booking/components/BookingDetailView";

export const metadata: Metadata = {
  title: "Booking Detail | Customer Booking | Neatly Hotel Admin",
};

export default async function CustomerBookingDetailPage(props: PageProps<"/customer-booking/[id]">) {
  const { id } = await props.params;
  const booking = await getCustomerBookingById(id);

  if (!booking) {
    notFound();
  }

  const [specialRequestCatalog, upgradeOptions] = await Promise.all([
    getSpecialRequestCatalogForDisplay(),
    isAdminBookingEditable(booking.status) ? getAdminRoomUpgradeOptions(id) : Promise.resolve([]),
  ]);

  return (
    <BookingDetailView
      booking={booking}
      specialRequestCatalog={specialRequestCatalog}
      upgradeOptions={upgradeOptions}
    />
  );
}
