import type { BookingPaymentStatus } from "@/types/booking";
import type { CustomerBookingDetail } from "@/types/customer-booking";

function formatAmount(amount: number) {
  return amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatThb(amount: number) {
  return `THB ${formatAmount(amount)}`;
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatPaymentMethod(booking: CustomerBookingDetail) {
  if (booking.paymentMethod === "cash") return "Cash";
  const brand = booking.cardBrand ? capitalize(booking.cardBrand) : "Credit Card";
  return booking.cardLast4 ? `${brand} •••• ${booking.cardLast4}` : brand;
}

function outstandingLabel(paymentStatus: BookingPaymentStatus): string {
  if (paymentStatus === "pay_at_hotel") return "Outstanding (pay at hotel)";
  if (paymentStatus === "failed") return "Outstanding (payment failed)";
  return "Outstanding (awaiting payment)";
}

type BookingPaymentBreakdownProps = {
  booking: CustomerBookingDetail;
};

export function BookingPaymentBreakdown({ booking }: BookingPaymentBreakdownProps) {
  const showPaid = booking.paidAmount > 0;
  const showOutstanding = booking.amountDue > 0;
  const fullyPaid = !showOutstanding && booking.paymentStatus === "paid";

  return (
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

      {(showPaid || showOutstanding) && (
        <div className="flex flex-col gap-2 border-t border-brand-border pt-3">
          {showPaid && (
            <div className="flex items-center justify-between text-brand-body">
              <span>Paid</span>
              <span className="font-medium text-emerald-700">{formatThb(booking.paidAmount)}</span>
            </div>
          )}

          {showOutstanding && (
            <div className="flex items-center justify-between rounded-md bg-amber-50 px-3 py-2 text-brand-body">
              <span className="font-medium">{outstandingLabel(booking.paymentStatus)}</span>
              <span className="font-semibold text-amber-800">{formatThb(booking.amountDue)}</span>
            </div>
          )}
        </div>
      )}

      {fullyPaid && (
        <p className="border-t border-brand-border pt-2 text-xs text-emerald-700">Fully paid</p>
      )}
    </div>
  );
}
