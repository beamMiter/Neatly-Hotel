"use client";

import { useMemo, useState } from "react";
import { EmailOtpVerification } from "@/features/booking/components/EmailOtpVerification";
import { resolveAddOnQuantity } from "@/lib/addon-pricing";
import { bookingEmailVerificationStorageKey } from "@/lib/booking-email-verification";
import type { SpecialRequestOption } from "@/types/booking";
import type { SupportBooking } from "@/types/live-support";
import type { WidgetLocale } from "@/features/chatbot/components/chat-widget.types";

const copy = {
  th: {
    bookingCancelled: "การจองถูกยกเลิก",
    bookingReady: "การจองพร้อมยืนยัน",
    order: "รายการ",
    pending: "รอชำระเงิน",
    confirmed: "ยืนยันแล้ว",
    cancelled: "ยกเลิกแล้ว",
    refunded: "ยกเลิกและคืนเงินแล้ว",
    room: "ห้องพัก",
    checkIn: "เช็คอิน",
    checkOut: "เช็คเอาต์",
    specialRequests: "บริการเสริม",
    trips: "จำนวนเที่ยว",
    guests: "จำนวนผู้ใช้บริการ",
    total: "รวม",
    saving: "กำลังบันทึก...",
    skip: "ข้ามบริการเสริม",
    confirm: "ยืนยันการจอง",
    unavailable: "ไม่สามารถเชื่อมต่อ Live Support ได้ กรุณาเริ่มแชตใหม่แล้วลองอีกครั้ง",
    saveFailed: "ไม่สามารถบันทึกบริการเสริมได้",
    night: " / คืน",
    trip: " / เที่ยว",
    guestDay: " / ท่าน / วัน",
    stay: " / การเข้าพัก",
  },
  en: {
    bookingCancelled: "Booking cancelled",
    bookingReady: "Booking ready",
    order: "Order",
    pending: "Pending",
    confirmed: "Confirmed",
    cancelled: "Cancelled",
    refunded: "Cancelled · Refunded",
    room: "Room",
    checkIn: "Check-in",
    checkOut: "Check-out",
    specialRequests: "Special requests",
    trips: "Trips",
    guests: "Guests",
    total: "Total",
    saving: "Saving requests...",
    skip: "Skip special requests",
    confirm: "Confirm booking",
    unavailable: "Live Support session is unavailable. Please reset the chat and try again.",
    saveFailed: "Unable to save special requests",
    night: " / night",
    trip: " / trip",
    guestDay: " / guest / day",
    stay: " / stay",
  },
} as const;

function formatBookingDate(value: string, locale: WidgetLocale) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return value;
  return new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

export function isBookingConfirmationMessage(message: { role: "user" | "assistant"; content: string }, booking: SupportBooking | null) {
  return Boolean(booking && message.role === "assistant" && message.content.startsWith(`Booking ${booking.bookingCode} is ready for confirmation`));
}

function addOnPriceLabel(option: SpecialRequestOption, locale: WidgetLocale) {
  const t = copy[locale];
  if (option.billingType === "per_night") return t.night;
  if (option.billingType === "per_leg") return t.trip;
  if (option.billingType === "per_day_guest") return t.guestDay;
  return t.stay;
}

function bookingStatusLabel(status: string, locale: WidgetLocale) {
  const t = copy[locale];
  if (status === "pending_payment") return t.pending;
  if (status === "confirmed") return t.confirmed;
  if (status === "cancelled") return t.cancelled;
  if (status === "refunded") return t.refunded;
  return status.replaceAll("_", " ");
}

export function SupportBookingCard({
  booking,
  specialRequestOptions,
  visitorToken,
  locale,
  onConfirmed,
}: {
  booking: SupportBooking;
  specialRequestOptions: SpecialRequestOption[];
  visitorToken: string | null;
  locale: WidgetLocale;
  onConfirmed: () => void;
}) {
  const t = copy[locale];
  const isPending = booking.status === "pending_payment";
  const isCancelled = booking.status === "cancelled" || booking.status === "refunded";
  const statusLabel = bookingStatusLabel(booking.status, locale);
  const nights = Math.max(
    Math.round((Date.parse(`${booking.checkOut}T00:00:00Z`) - Date.parse(`${booking.checkIn}T00:00:00Z`)) / 86_400_000),
    1,
  );
  const [selectedCounts, setSelectedCounts] = useState<Record<string, number>>(() => Object.fromEntries(
    booking.specialRequests.map((selected) => {
      const option = specialRequestOptions.find((item) => item.code === selected.code);
      const count = option?.billingType === "per_day_guest"
        ? Math.max(Math.round(selected.quantity / nights), 1)
        : option?.billingType === "per_leg" ? selected.quantity : 1;
      return [selected.code, count];
    }),
  ));
  const [isSkippingSpecialRequests, setIsSkippingSpecialRequests] = useState(false);
  const [emailVerificationToken, setEmailVerificationToken] = useState<string | null>(null);
  const [emailVerificationError, setEmailVerificationError] = useState<string | undefined>();
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState("");
  const addonsTotal = useMemo(() => specialRequestOptions.reduce((sum, option) => {
    const count = selectedCounts[option.code];
    return count ? sum + option.price * resolveAddOnQuantity(option.billingType, count, nights) : sum;
  }, 0), [nights, selectedCounts, specialRequestOptions]);
  const previewTotal = booking.totalAmount - booking.addonsTotal + addonsTotal;

  function toggleSpecialRequest(code: string) {
    if (isSkippingSpecialRequests) return;
    setSelectedCounts((current) => {
      const next = { ...current };
      if (next[code]) delete next[code];
      else next[code] = 1;
      return next;
    });
    setConfirmError("");
  }

  function toggleSkipSpecialRequests() {
    const next = !isSkippingSpecialRequests;
    setIsSkippingSpecialRequests(next);
    if (next) setSelectedCounts({});
    setConfirmError("");
  }

  async function confirmBooking() {
    if (isConfirming) return;
    const specialRequests = isSkippingSpecialRequests ? {} : selectedCounts;
    const hasSpecialRequestsToSave = Object.keys(specialRequests).length > 0 || booking.specialRequests.length > 0;
    const needsServerConfirmation = booking.requiresEmailVerification
      || (specialRequestOptions.length > 0 && hasSpecialRequestsToSave);
    if (needsServerConfirmation) {
      if (!visitorToken) {
        setConfirmError(t.unavailable);
        return;
      }
      if (booking.requiresEmailVerification && !emailVerificationToken) {
        setEmailVerificationError("Please verify your email before confirming this booking");
        return;
      }
      setIsConfirming(true);
      setConfirmError("");
      try {
        const response = await fetch("/api/live-support/visitor/booking", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            visitorToken,
            bookingId: booking.id,
            ...(emailVerificationToken ? { emailVerificationToken } : {}),
            specialRequests: Object.entries(specialRequests).map(([code, count]) => ({ code, count })),
          }),
        });
        const data = await response.json().catch(() => ({})) as { error?: string };
        if (!response.ok) throw new Error(data.error ?? t.saveFailed);
      } catch (error) {
        setConfirmError(error instanceof Error ? error.message : t.saveFailed);
        setIsConfirming(false);
        return;
      }
    }
    if (emailVerificationToken) {
      window.sessionStorage.setItem(bookingEmailVerificationStorageKey(booking.id), emailVerificationToken);
    }
    onConfirmed();
  }

  return (
    <article className="w-full shrink-0 overflow-hidden rounded-xl border border-[#E7C6BA] bg-white shadow-[0_5px_18px_rgba(91,60,48,.1)]" aria-label={`${t.order} ${booking.bookingCode}`}>
      <div className="flex items-center justify-between bg-[#FFF1EB] px-4 py-3">
        <div>
          <p className={`m-0 text-xs font-semibold uppercase tracking-[.08em] ${isCancelled ? "text-[#B42318]" : "text-[#A84A25]"}`}>{isCancelled ? t.bookingCancelled : t.bookingReady}</p>
          <h3 className="m-0 mt-0.5 text-base font-semibold text-[#2A2E3F]">{t.order} {booking.bookingCode}</h3>
        </div>
        <span className={`rounded-full bg-white px-2.5 py-1 text-xs font-semibold capitalize ${isCancelled ? "text-[#B42318]" : "text-[#A84A25]"}`}>{statusLabel}</span>
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 px-4 py-4 text-sm">
        <div className="col-span-2"><dt className="text-xs text-[#8A91A7]">{t.room}</dt><dd className="m-0 mt-0.5 font-medium text-[#2A2E3F]">{booking.roomType}</dd></div>
        <div><dt className="text-xs text-[#8A91A7]">{t.checkIn}</dt><dd className="m-0 mt-0.5 font-medium text-[#2A2E3F]">{formatBookingDate(booking.checkIn, locale)}</dd></div>
        <div><dt className="text-xs text-[#8A91A7]">{t.checkOut}</dt><dd className="m-0 mt-0.5 font-medium text-[#2A2E3F]">{formatBookingDate(booking.checkOut, locale)}</dd></div>
        {isPending && specialRequestOptions.length > 0 && (
          <div className="col-span-2 border-t border-[#EEF0F4] pt-3">
            <dt className="text-xs font-semibold uppercase tracking-[.06em] text-[#8A91A7]">{t.specialRequests}</dt>
            <dd className="m-0 mt-2 grid gap-2">
              {specialRequestOptions.map((option) => {
                const selected = Boolean(selectedCounts[option.code]);
                const allowsCount = option.billingType === "per_leg" || option.billingType === "per_day_guest";
                return <div className={`rounded-lg border p-2.5 transition-colors ${isSkippingSpecialRequests ? "border-[#E4E6ED] bg-[#F4F5F7]" : selected ? "border-[#E5A98F] bg-[#FFF8F5]" : "border-[#E4E6ED] bg-white"}`} key={option.code}>
                  <label className={`flex items-start gap-2.5 ${isSkippingSpecialRequests ? "cursor-not-allowed" : "cursor-pointer"}`}>
                    <input className="mt-0.5 h-4 w-4 accent-[#C14817] disabled:cursor-not-allowed" type="checkbox" checked={selected} disabled={isSkippingSpecialRequests} onChange={() => toggleSpecialRequest(option.code)} />
                    <span className="min-w-0 flex-1"><span className={`block text-sm font-medium ${isSkippingSpecialRequests ? "text-[#A4A9B8]" : "text-[#2A2E3F]"}`}>{option.label}</span><span className={`block text-xs ${isSkippingSpecialRequests ? "text-[#B4B8C5]" : "text-[#8A91A7]"}`}>THB {option.price.toLocaleString("en-US")}{addOnPriceLabel(option, locale)}</span></span>
                  </label>
                  {selected && allowsCount && <label className="mt-2 flex items-center justify-between border-t border-[#F0DDD5] pt-2 text-xs text-[#646D89]">{option.billingType === "per_leg" ? t.trips : t.guests}<select className="h-8 rounded-md border border-[#D6D9E4] bg-white px-2 text-sm text-[#2A2E3F]" value={selectedCounts[option.code]} onChange={(event) => setSelectedCounts((current) => ({ ...current, [option.code]: Number(event.target.value) }))}><option value={1}>1</option><option value={2}>2</option></select></label>}
                </div>;
              })}
              <label className={`flex cursor-pointer items-start gap-2.5 rounded-lg border p-2.5 transition-colors ${isSkippingSpecialRequests ? "border-[#E5A98F] bg-[#FFF8F5]" : "border-[#E4E6ED] bg-white"}`}>
                <input className="mt-0.5 h-4 w-4 accent-[#C14817]" type="checkbox" checked={isSkippingSpecialRequests} onChange={toggleSkipSpecialRequests} />
                <span className="min-w-0 flex-1 text-sm font-medium text-[#2A2E3F]">{t.skip}</span>
              </label>
            </dd>
          </div>
        )}
        {isPending && booking.requiresEmailVerification && (
          <div className="col-span-2 border-t border-[#EEF0F4] pt-3">
            <EmailOtpVerification
              email={booking.guestEmail}
              emailValid={/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(booking.guestEmail)}
              verified={Boolean(emailVerificationToken)}
              error={emailVerificationError}
              onVerified={(token) => {
                setEmailVerificationToken(token);
                setEmailVerificationError(undefined);
              }}
              onClearVerification={() => {
                setEmailVerificationToken(null);
                setEmailVerificationError(undefined);
              }}
            />
          </div>
        )}
        <div className="col-span-2 flex items-end justify-between border-t border-[#EEF0F4] pt-3"><dt className="text-sm font-medium text-[#646D89]">{t.total}</dt><dd className="m-0 text-base font-semibold text-[#C14817]">THB {previewTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}</dd></div>
      </dl>
      {isPending && confirmError && <p className="m-0 border-t border-[#F3D4C8] bg-[#FFF8F5] px-4 py-2 text-xs text-[#B42318]">{confirmError}</p>}
      {isPending && <div className="grid gap-2 border-t border-[#EEF0F4] p-3">
        <button type="button" onClick={() => void confirmBooking()} disabled={isConfirming || (booking.requiresEmailVerification && !emailVerificationToken)} className="flex w-full items-center justify-center rounded-lg bg-[#C14817] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#A93F13] focus:outline-2 focus:outline-offset-2 focus:outline-[#C14817] disabled:cursor-not-allowed disabled:opacity-50">{isConfirming ? <span className="flex items-center justify-center gap-2"><span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />{t.saving}</span> : t.confirm}</button>
      </div>}
    </article>
  );
}
