import Link from "next/link";
import { format } from "date-fns";
import { ArrowLeftIcon } from "@/components/icons/ArrowLeftIcon";
import { BookingPaymentBreakdown } from "@/features/customer-booking/components/BookingPaymentBreakdown";
import { BookingSpecialRequestsSection } from "@/features/customer-booking/components/BookingSpecialRequestsSection";
import { BookingStayActions } from "@/features/customer-booking/components/BookingStayActions";
import type { SpecialRequestOption } from "@/types/booking";
import type { BookingStatus } from "@/types/booking";
import type { CustomerBookingDetail } from "@/types/customer-booking";

function formatDate(value: string) {
  return format(new Date(value), "EEE, d MMM yyyy");
}

function formatStatus(status: BookingStatus) {
  return status.replaceAll("_", " ");
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm text-brand-muted">{label}</span>
      <span className="text-sm text-brand-body">{value}</span>
    </div>
  );
}

export function BookingDetailView({
  booking,
  specialRequestCatalog,
}: {
  booking: CustomerBookingDetail;
  specialRequestCatalog: SpecialRequestOption[];
}) {
  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-3 border-b border-brand-border bg-white px-8 py-5">
        <Link
          href="/customer-booking"
          aria-label="Back to Customer Booking"
          className="text-brand-body transition-colors hover:text-brand-primary"
        >
          <ArrowLeftIcon className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-semibold text-brand-body">
          {booking.customerName} <span className="font-normal text-brand-muted">{booking.roomType}</span>
        </h1>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-8 py-8">
        <div className="mx-auto flex max-w-3xl flex-col gap-6 rounded-lg border border-brand-border bg-white p-8">
          <Field label="Booking code" value={booking.bookingCode} />
          <Field label="Status" value={formatStatus(booking.status)} />
          <Field label="Customer name" value={booking.customerName} />
          <Field label="Guest(s)" value={String(booking.guests)} />
          <Field label="Room type" value={booking.roomType} />
          <Field
            label="Room no."
            value={booking.roomNos.length > 0 ? booking.roomNos.join(", ") : "-"}
          />
          <Field label="Amount" value={`${booking.amount} room${booking.amount === 1 ? "" : "s"}`} />
          <Field label="Bed type" value={booking.bedType} />
          <Field label="Check-in" value={formatDate(booking.checkIn)} />
          <Field label="Check-out" value={formatDate(booking.checkOut)} />
          <Field label="Stay (total)" value={`${booking.nights} night${booking.nights === 1 ? "" : "s"}`} />
          <Field label="Booking date" value={formatDate(booking.bookingDate)} />

          <BookingSpecialRequestsSection booking={booking} catalog={specialRequestCatalog} />

          <BookingPaymentBreakdown booking={booking} />

          {booking.additionalRequest && (
            <div className="flex flex-col gap-1 rounded-md bg-brand-surface-alt px-5 py-4">
              <span className="text-sm font-medium text-brand-body">Additional Request</span>
              <span className="text-sm text-brand-body">{booking.additionalRequest}</span>
            </div>
          )}

          <BookingStayActions booking={booking} />
        </div>
      </div>
    </div>
  );
}
