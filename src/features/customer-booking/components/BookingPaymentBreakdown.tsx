"use client";

import Link from "next/link";
import { useState } from "react";
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
  const [copied, setCopied] = useState(false);
  const [isCreatingLink, setIsCreatingLink] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);

  const showPaid = booking.paidAmount > 0;
  const showOutstanding = booking.amountDue > 0;
  const fullyPaid = !showOutstanding && booking.paymentStatus === "paid";
  const showStripeCollection =
    showOutstanding && booking.paymentStatus === "pending" && booking.status !== "pending_payment";

  async function copyPaymentLink() {
    setIsCreatingLink(true);
    setLinkError(null);
    setCopied(false);
    try {
      const response = await fetch(`/api/admin/bookings/${booking.id}/payment-intent`, {
        method: "POST",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setLinkError(data.message ?? "Unable to create payment link");
        return;
      }
      const url = data.paymentUrl ?? `/booking/payment?bookingId=${booking.id}`;
      setPaymentUrl(url);
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setLinkError("Unable to copy payment link — please try again");
    } finally {
      setIsCreatingLink(false);
    }
  }

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

      {showStripeCollection && (
        <div className="flex flex-col gap-2 border-t border-brand-border pt-3">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/booking/payment?bookingId=${booking.id}`}
              className="inline-flex rounded bg-brand-primary px-3 py-2 text-xs font-semibold text-white hover:bg-brand-primary-hover"
            >
              Collect payment
            </Link>
            <button
              type="button"
              onClick={() => void copyPaymentLink()}
              disabled={isCreatingLink}
              className="inline-flex rounded border border-brand-border bg-white px-3 py-2 text-xs font-semibold text-brand-body hover:bg-brand-surface disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isCreatingLink ? "Preparing link..." : copied ? "Link copied" : "Copy payment link"}
            </button>
          </div>
          {linkError && <p className="text-xs text-red-600">{linkError}</p>}
          {paymentUrl && (
            <p className="break-all text-xs text-brand-muted">{paymentUrl}</p>
          )}
        </div>
      )}

      {fullyPaid && (
        <p className="border-t border-brand-border pt-2 text-xs text-emerald-700">Fully paid</p>
      )}
    </div>
  );
}
