"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { nightsBetween } from "@/features/booking/date-rules";
import { formatThb } from "@/features/booking/format";
import { resolveAddOnQuantity, MAX_ADD_ON_COUNT } from "@/lib/addon-pricing";
import {
  basicInfoSchema,
  type BasicInfoFieldErrors,
} from "@/features/booking/validations";
import { WizardStepper } from "@/features/booking/components/WizardStepper";
import {
  BasicInfoStep,
  type BasicInfoFields,
} from "@/features/booking/components/steps/BasicInfoStep";
import { SpecialRequestStep } from "@/features/booking/components/steps/SpecialRequestStep";
import { PaymentMethodStep } from "@/features/booking/components/steps/PaymentMethodStep";
import { BookingSummaryPanel } from "@/features/booking/components/BookingSummaryPanel";
import type { SubmitBookingResult } from "@/features/booking/components/wizard-submit";
import type {
  ProfilePrefill,
  SelectedSpecialRequest,
  SpecialRequestOption,
} from "@/types/booking";

type BookingWizardProps = {
  roomTypeId: string;
  roomName: string;
  pricePerNight: number;
  checkIn: string;
  checkOut: string;
  guests: number;
  rooms: number;
  specialRequestCatalog: SpecialRequestOption[];
  prefill: ProfilePrefill | null;
  isLoggedIn: boolean;
  checkInTimeLabel: string;
  checkOutTimeLabel: string;
};

const EMPTY_BASIC_INFO: BasicInfoFields = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  dateOfBirth: undefined,
  country: "",
};

export function BookingWizard({
  roomTypeId,
  roomName,
  pricePerNight,
  checkIn,
  checkOut,
  guests,
  rooms,
  specialRequestCatalog,
  prefill,
  isLoggedIn,
  checkInTimeLabel,
  checkOutTimeLabel,
}: BookingWizardProps) {
  const requiresEmailVerification = !isLoggedIn;
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Each step change re-renders the same scroll position — without this,
  // moving from a step where the guest scrolled down to reach "Next" lands
  // them mid-way through the next step instead of at its top.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);
  const [basicInfo, setBasicInfo] = useState<BasicInfoFields>(
    prefill
      ? {
          firstName: prefill.firstName,
          lastName: prefill.lastName,
          email: prefill.email,
          phone: prefill.phone,
          // "YYYY-MM-DD" alone parses as UTC midnight, which renders as the
          // previous day for UTC− viewers — pin it to local midnight instead.
          dateOfBirth: prefill.dateOfBirth
            ? new Date(`${prefill.dateOfBirth}T00:00:00`)
            : undefined,
          country: prefill.country,
        }
      : EMPTY_BASIC_INFO,
  );
  const [basicInfoErrors, setBasicInfoErrors] = useState<BasicInfoFieldErrors>(
    {},
  );
  const [emailVerified, setEmailVerified] = useState(false);
  const [emailVerificationToken, setEmailVerificationToken] = useState<string | null>(null);
  const [emailVerificationError, setEmailVerificationError] = useState<string | undefined>();
  const [standardRequests, setStandardRequests] = useState<string[]>([]);
  // code -> count. A code is absent when unselected, so the map's keys are
  // exactly the chosen add-ons. The number only means anything for per_leg
  // (legs chosen) / per_day_guest (guests) — for every other billing type
  // it's stored as 1 just to mark "selected" and ignored by pricing, which
  // derives the real multiplier from billingType + nights instead
  // (see resolveAddOnQuantity).
  const [specialRequestSelections, setSpecialRequestSelections] = useState<Record<string, number>>({});
  const [additionalRequest, setAdditionalRequest] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"credit_card" | "cash" | "promptpay">(
    "credit_card",
  );
  const [promoCode, setPromoCode] = useState("");
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [promoMessage, setPromoMessage] = useState<string | null>(null);
  const [promoValid, setPromoValid] = useState(false);

  const nights = useMemo(
    () => Math.max(nightsBetween(checkIn, checkOut), 1),
    [checkIn, checkOut],
  );
  const roomSubtotal = pricePerNight * nights * rooms;

  // Preview only — the server re-resolves prices and re-totals at submit,
  // using the exact same resolveAddOnQuantity() math so this never drifts
  // from what the guest is actually charged. Ordered by the catalog, not by
  // click order, so the summary rows stay put as selections change.
  const selectedAddons: SelectedSpecialRequest[] = useMemo(
    () =>
      specialRequestCatalog
        .filter((option) => option.code in specialRequestSelections)
        .map((option) => ({
          code: option.code,
          label: option.label,
          price: option.price,
          quantity: resolveAddOnQuantity(option.billingType, specialRequestSelections[option.code], nights),
        })),
    [specialRequestSelections, specialRequestCatalog, nights],
  );
  const addonsTotal = selectedAddons.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const subtotal = roomSubtotal + addonsTotal;
  const totalAmount = subtotal - promoDiscount;

  // Live promo preview only — POST /api/bookings independently re-resolves
  // the code server-side as the authoritative value at submit time.
  useEffect(() => {
    const trimmed = promoCode.trim();
    const timeout = setTimeout(() => {
      if (!trimmed) {
        setPromoDiscount(0);
        setPromoValid(false);
        setPromoMessage(null);
        return;
      }
      fetch("/api/booking/promo/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: trimmed, roomTypeId, subtotal }),
      })
        .then((response) => response.json())
        .then((result) => {
          const data = result.data;
          if (data?.valid) {
            setPromoDiscount(data.discountAmount);
            setPromoValid(true);
            setPromoMessage(`Promo code applied — you save ${formatThb(data.discountAmount)}`);
          } else {
            setPromoDiscount(0);
            setPromoValid(false);
            setPromoMessage(data?.message ?? "This promotion code is invalid");
          }
        })
        // Network/server failure — stay silent rather than telling the guest
        // their code is wrong when it might just be our request that failed.
        .catch(() => {
          setPromoDiscount(0);
          setPromoValid(false);
          setPromoMessage(null);
        });
    }, 400);
    return () => clearTimeout(timeout);
  }, [promoCode, roomTypeId, subtotal]);

  function toggleStandardRequest(code: string) {
    setStandardRequests((prev) =>
      prev.includes(code)
        ? prev.filter((item) => item !== code)
        : [...prev, code],
    );
  }

  // Ticking a box selects it (count 1); for per_leg/per_day_guest items the
  // count control adjusts from there. count <= 0 removes the key entirely
  // (unselected) rather than storing a 0.
  function setSpecialRequestCount(code: string, count: number) {
    setSpecialRequestSelections((prev) => {
      const next = { ...prev };
      const clamped = Math.min(Math.max(Math.trunc(count), 0), MAX_ADD_ON_COUNT);
      if (clamped === 0) {
        delete next[code];
      } else {
        next[code] = clamped;
      }
      return next;
    });
  }

  function handleBasicInfoChange<K extends keyof BasicInfoFields>(
    field: K,
    value: BasicInfoFields[K],
  ) {
    setBasicInfo((prev) => ({ ...prev, [field]: value }));
    if (field === "email") {
      setEmailVerified(false);
      setEmailVerificationToken(null);
      setEmailVerificationError(undefined);
    }
    setBasicInfoErrors((prev) =>
      prev[field as keyof BasicInfoFieldErrors]
        ? { ...prev, [field]: undefined }
        : prev,
    );
  }

  const handleEmailVerified = useCallback((_token: string, _expiresAt: string) => {
    setEmailVerified(true);
    setEmailVerificationToken(_token);
    setEmailVerificationError(undefined);
  }, []);

  const handleClearEmailVerification = useCallback(() => {
    setEmailVerified(false);
    setEmailVerificationToken(null);
    setEmailVerificationError(undefined);
  }, []);

  function handleBasicInfoNext() {
    const result = basicInfoSchema.safeParse(basicInfo);
    if (!result.success) {
      const fieldErrors: BasicInfoFieldErrors = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof BasicInfoFieldErrors | undefined;
        if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setBasicInfoErrors(fieldErrors);
      return;
    }

    if (requiresEmailVerification && !emailVerified) {
      setEmailVerificationError("Please verify your email before continuing");
      return;
    }

    setBasicInfoErrors({});
    setEmailVerificationError(undefined);
    setStep(2);
  }

  async function submitBooking(): Promise<SubmitBookingResult> {
    if (!basicInfo.dateOfBirth) {
      return { ok: false, message: "Date of birth is required" };
    }

    const payload = {
      firstName: basicInfo.firstName,
      lastName: basicInfo.lastName,
      email: basicInfo.email,
      phone: basicInfo.phone,
      ...(requiresEmailVerification && emailVerificationToken
        ? { emailVerificationToken: emailVerificationToken }
        : {}),
      // The picker builds a local-midnight Date, so toISOString() would shift
      // the calendar day backwards for every UTC+ guest (Bangkok included).
      // Send the local Y/M/D instead — the API re-parses it as UTC midnight,
      // which round-trips to the same date the guest actually picked.
      dateOfBirth: format(basicInfo.dateOfBirth, "yyyy-MM-dd"),
      country: basicInfo.country,
      standardRequests,
      // Send the raw selection (code + the 1-2 count for per_leg/per_day_guest
      // items) — never selectedAddons' `quantity`, which is already the
      // server-computed final multiplier and isn't what this field means.
      specialRequests: Object.entries(specialRequestSelections).map(([code, count]) => ({ code, count })),
      additionalRequest: additionalRequest || undefined,
      promoCode: promoCode || undefined,
      paymentMethod,
      roomTypeId,
      checkIn,
      checkOut,
      guests,
      rooms,
    };

    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        // The API only ever returns a generic "Validation failed" message —
        // the real cause is in fieldErrors. Fold it in so the guest (and we,
        // debugging) can actually tell which field broke instead of guessing.
        const detail = data.fieldErrors ? Object.values(data.fieldErrors).join(" ") : "";
        return {
          ok: false,
          message: detail ? `${data.message ?? "Validation failed"}: ${detail}` : (data.message ?? "Failed to create booking"),
          fieldErrors: data.fieldErrors,
        };
      }

      return {
        ok: true,
        bookingId: data.bookingId,
        clientSecret: data.clientSecret ?? null,
      };
    } catch {
      return { ok: false, message: "Network error — please try again" };
    }
  }

  return (
    <div className="mx-auto max-w-[1122px] px-4 py-6 lg:py-10">
      <h1 className="[font-family:var(--font-noto-serif)] text-[44px] leading-[125%] font-medium tracking-[-0.02em] text-[#2F3E35] lg:text-[68px]">
        Booking Room
      </h1>
      <WizardStepper current={step} />

      {/* -mx-4 cancels this page's own px-4 so the white/green/gray cards below
          go edge-to-edge at 375px on mobile (Figma: each card owns its 16px
          horizontal inset, not the page) — reverts to normal at lg. */}
      <div className="-mx-4 grid grid-cols-1 items-start gap-6 pt-6 lg:mx-0 lg:pt-10 lg:grid-cols-[740px_358px]">
        <div className="flex flex-col gap-8">
          {step === 1 && (
            <BasicInfoStep
              fields={basicInfo}
              errors={basicInfoErrors}
              requiresEmailVerification={requiresEmailVerification}
              emailVerified={emailVerified}
              emailVerificationError={emailVerificationError}
              onEmailVerified={handleEmailVerified}
              onClearEmailVerification={handleClearEmailVerification}
              onChange={handleBasicInfoChange}
              onBack={() => router.back()}
              onNext={handleBasicInfoNext}
            />
          )}

          {step === 2 && (
            <SpecialRequestStep
              catalog={specialRequestCatalog}
              standardRequests={standardRequests}
              specialRequestSelections={specialRequestSelections}
              nights={nights}
              additionalRequest={additionalRequest}
              onToggleStandard={toggleStandardRequest}
              onSpecialCountChange={setSpecialRequestCount}
              onAdditionalRequestChange={setAdditionalRequest}
              onBack={() => setStep(1)}
              onNext={() => setStep(3)}
            />
          )}

          {step === 3 && (
            <PaymentMethodStep
              paymentMethod={paymentMethod}
              onPaymentMethodChange={setPaymentMethod}
              guestEmail={basicInfo.email}
              promoCode={promoCode}
              onPromoCodeChange={setPromoCode}
              promoMessage={promoMessage}
              promoValid={promoValid}
              onSubmit={submitBooking}
              onBack={() => setStep(2)}
            />
          )}
        </div>

        <BookingSummaryPanel
          roomName={roomName}
          checkIn={checkIn}
          checkOut={checkOut}
          checkInTimeLabel={checkInTimeLabel}
          checkOutTimeLabel={checkOutTimeLabel}
          guests={guests}
          nights={nights}
          rooms={rooms}
          roomSubtotal={roomSubtotal}
          selectedAddons={selectedAddons}
          discountAmount={promoDiscount}
          totalAmount={totalAmount}
        />
      </div>
    </div>
  );
}
