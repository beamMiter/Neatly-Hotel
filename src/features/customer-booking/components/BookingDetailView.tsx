import Link from "next/link";
import { format } from "date-fns";
import { ArrowLeftIcon } from "@/components/icons/ArrowLeftIcon";
import { BookingStayActions } from "@/features/customer-booking/components/BookingStayActions";
import type { BookingStatus } from "@/types/booking";
import type { CustomerBookingDetail } from "@/types/customer-booking";

function formatDate(value: string) {
  return format(new Date(value), "EEE, d MMM yyyy");
}

function formatAmount(amount: number) {
  return amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatThb(amount: number) {
  return `THB ${formatAmount(amount)}`;
}

function formatStatus(status: BookingStatus) {
  return status.replaceAll("_", " ");
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatPaymentMethod(booking: CustomerBookingDetail) {
  if (booking.paymentMethod === "cash") return "Cash";
  const brand = booking.cardBrand ? capitalize(booking.cardBrand) : "Credit Card";
  return booking.cardLast4 ? `${brand} •••• ${booking.cardLast4}` : brand;
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm text-brand-muted">{label}</span>
      <span className="text-sm text-brand-body">{value}</span>
    </div>
  );
}

export function BookingDetailView({ booking }: { booking: CustomerBookingDetail }) {
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

          {booking.standardRequests.length > 0 && (
            <div className="flex flex-col gap-1">
              <span className="text-sm text-brand-muted">Requests</span>
              <div className="flex flex-wrap gap-2">
                {booking.standardRequests.map((label) => (
                  <span
                    key={label}
                    className="rounded-full bg-brand-surface-alt px-3 py-1 text-xs text-brand-body"
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2 rounded-md bg-brand-surface px-5 py-4 text-sm text-brand-body">
            <div className="flex items-center justify-between pb-2 text-xs text-brand-muted">
              <span>Payment {booking.paymentStatus.replaceAll("_", " ")} via</span>
              <span className="font-semibold text-brand-body">{formatPaymentMethod(booking)}</span>
            </div>

            <div className="flex items-center justify-between">
              <span>{booking.roomType}</span>
              <span>{formatAmount(booking.roomSubtotal)}</span>
            </div>

            {booking.specialRequests.map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <span>
                  {item.label}
                  {item.quantity > 1 ? ` ×${item.quantity}` : ""}
                </span>
                <span>{formatAmount(item.price * item.quantity)}</span>
              </div>
            ))}

            {booking.promoCode && (
              <div className="flex items-center justify-between">
                <span>Promotion Code ({booking.promoCode})</span>
                <span>-{formatAmount(booking.discountAmount)}</span>
              </div>
            )}

            <div className="flex items-center justify-between border-t border-brand-border pt-2 font-semibold">
              <span>Total</span>
              <span>{formatThb(booking.totalAmount)}</span>
            </div>
          </div>

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
