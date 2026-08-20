"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BookingBasicInfoStep } from "@/features/booking-flow/components/BookingBasicInfoStep";
import { BookingDetailSidebar } from "@/features/booking-flow/components/BookingDetailSidebar";
import { BookingPaymentPlaceholder } from "@/features/booking-flow/components/BookingPaymentPlaceholder";
import { BookingSpecialRequestStep } from "@/features/booking-flow/components/BookingSpecialRequestStep";
import { BookingStepper } from "@/features/booking-flow/components/BookingStepper";
import { saveBookingDraft } from "@/features/booking-flow/draft-storage";
import { calculateBookingPrice, validateSpecialRequests } from "@/features/booking-flow/pricing";
import type {
  BookingBasicInfo,
  BookingDraft,
  BookingFlowRoom,
  BookingSpecialRequests,
  BookingStep,
} from "@/features/booking-flow/types";
import { parseBookingBasicInfo, type BookingBasicInfoFieldErrors } from "@/features/booking-flow/validations";
import type { SearchQuery } from "@/features/booking/types";

type BookingFlowViewProps = {
  room: BookingFlowRoom;
  search: SearchQuery;
  initialBasicInfo: BookingBasicInfo;
};

const EMPTY_SPECIAL_REQUESTS: BookingSpecialRequests = {
  standardRequests: [],
  paidAddOns: [],
  paidAddOnSelections: {},
  paidAddOnGuests: {},
  additionalRequest: "",
};

export function BookingFlowView({ room, search, initialBasicInfo }: BookingFlowViewProps) {
  const [step, setStep] = useState<BookingStep>(1);
  const [basicInfo, setBasicInfo] = useState<BookingBasicInfo>(initialBasicInfo);
  const [specialRequests, setSpecialRequests] = useState<BookingSpecialRequests>(EMPTY_SPECIAL_REQUESTS);
  const [fieldErrors, setFieldErrors] = useState<BookingBasicInfoFieldErrors>({});
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [savedDraft, setSavedDraft] = useState<BookingDraft | null>(null);
  const [specialRequestError, setSpecialRequestError] = useState<string | null>(null);

  const pricing = useMemo(
    () =>
      calculateBookingPrice({
        checkIn: search.checkIn,
        checkOut: search.checkOut,
        rooms: search.rooms,
        pricePerNight: room.discountedPrice,
        specialRequests,
      }),
    [room.discountedPrice, search.checkIn, search.checkOut, search.rooms, specialRequests],
  );

  function clearFieldError(field: keyof BookingBasicInfo) {
    setFieldErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
  }

  async function handleStepOneNext() {
    setAvailabilityError(null);

    const parsed = parseBookingBasicInfo(basicInfo);
    if (!parsed.success) {
      setFieldErrors(parsed.fieldErrors);
      return;
    }

    setFieldErrors({});
    setIsCheckingAvailability(true);

    try {
      const params = new URLSearchParams({
        roomTypeId: room.id,
        checkIn: search.checkIn,
        checkOut: search.checkOut,
        guests: String(search.guests),
        rooms: String(search.rooms),
      });

      const response = await fetch(`/api/booking/availability?${params.toString()}`);
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setAvailabilityError(payload?.error ?? "Unable to verify room availability. Please try again.");
        return;
      }

      const availability = payload?.data;
      if (!availability?.canBook) {
        setAvailabilityError(availability?.reasons?.join(" ") ?? "This room is not available for the selected dates.");
        return;
      }

      setStep(2);
    } catch {
      setAvailabilityError("Unable to verify room availability. Please try again.");
    } finally {
      setIsCheckingAvailability(false);
    }
  }

  function handleStepTwoNext() {
    const validationError = validateSpecialRequests(specialRequests);
    if (validationError) {
      setSpecialRequestError(validationError);
      return;
    }

    setSpecialRequestError(null);

    const draft: BookingDraft = {
      roomTypeId: room.id,
      roomTypeName: room.name,
      pricePerNight: room.discountedPrice,
      search,
      basicInfo,
      specialRequests,
      nights: pricing.nights,
      roomSubtotal: pricing.roomSubtotal,
      addOnsTotal: pricing.addOnsTotal,
      totalAmount: pricing.totalAmount,
      updatedAt: new Date().toISOString(),
    };

    saveBookingDraft(draft);
    setSavedDraft(draft);
    setStep(3);
  }

  function handleBack() {
    setStep((current) => (current > 1 ? ((current - 1) as BookingStep) : current));
  }

  return (
    <main className="flex-1 bg-[#F7F7FB]">
      <div className="mx-auto max-w-282 px-6 py-10 sm:px-10 lg:px-0 lg:py-16">
        <h1 className="[font-family:var(--font-noto-serif)] text-4xl font-medium font-stretch-[87.5%] tracking-[-0.02em] text-[#2F3E35] lg:text-[44px]">
          Booking Room
        </h1>

        <div className="mt-10">
          <BookingStepper currentStep={step} />
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-10">
          <div className="rounded-lg bg-white px-6 py-8 shadow-sm sm:px-8 sm:py-10">
            {step === 1 && (
              <BookingBasicInfoStep
                value={basicInfo}
                errors={fieldErrors}
                onChange={setBasicInfo}
                onClearError={clearFieldError}
              />
            )}

            {step === 2 && (
              <BookingSpecialRequestStep
                checkIn={search.checkIn}
                checkOut={search.checkOut}
                bookingGuests={search.guests}
                value={specialRequests}
                onChange={(next) => {
                  setSpecialRequests(next);
                  if (specialRequestError) setSpecialRequestError(null);
                }}
                error={specialRequestError}
              />
            )}

            {step === 3 && savedDraft && <BookingPaymentPlaceholder draft={savedDraft} />}

            <div className="mt-10 flex items-center justify-between">
              {step === 1 ? (
                <Link
                  href={`/rooms/${room.id}`}
                  className="[font-family:var(--font-open-sans)] text-base font-semibold text-[#C14817] hover:text-[#A93F13]"
                >
                  Back
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={handleBack}
                  className="[font-family:var(--font-open-sans)] text-base font-semibold text-[#C14817] hover:text-[#A93F13]"
                >
                  Back
                </button>
              )}

              {step === 1 && (
                <button
                  type="button"
                  onClick={handleStepOneNext}
                  disabled={isCheckingAvailability}
                  className="flex h-12 min-w-36 cursor-pointer items-center justify-center rounded bg-[#C14817] px-8 [font-family:var(--font-open-sans)] text-base font-semibold text-white transition-colors hover:bg-[#A93F13] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isCheckingAvailability ? "Checking..." : "Next"}
                </button>
              )}

              {step === 2 && (
                <button
                  type="button"
                  onClick={handleStepTwoNext}
                  className="flex h-12 min-w-36 cursor-pointer items-center justify-center rounded bg-[#C14817] px-8 [font-family:var(--font-open-sans)] text-base font-semibold text-white transition-colors hover:bg-[#A93F13]"
                >
                  Next
                </button>
              )}
            </div>
          </div>

          <BookingDetailSidebar
            room={room}
            search={search}
            pricing={pricing}
            currentStep={step}
            availabilityError={availabilityError}
          />
        </div>
      </div>
    </main>
  );
}
