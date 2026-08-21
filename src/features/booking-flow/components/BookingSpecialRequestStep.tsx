"use client";

import {
  AIRPORT_TRANSFER_LEGS,
  BREAKFAST_ADD_ON_ID,
  BREAKFAST_GUEST_OPTIONS,
  PAID_ADD_ON_OPTIONS,
  STANDARD_REQUEST_OPTIONS,
  type AddOnBilling,
} from "@/features/booking-flow/constants";
import type { BookingSpecialRequests } from "@/features/booking-flow/types";
import { getDefaultPaidAddOnDays, getStayServiceDays } from "@/features/booking-flow/utils";

type BookingSpecialRequestStepProps = {
  checkIn: string;
  checkOut: string;
  bookingGuests: number;
  value: BookingSpecialRequests;
  onChange: (next: BookingSpecialRequests) => void;
  error?: string | null;
};

function toggleValue(values: string[], id: string) {
  return values.includes(id) ? values.filter((item) => item !== id) : [...values, id];
}

function formatAddOnPrice(price: number, billing: AddOnBilling, addOnId: string) {
  const formatted = price.toLocaleString("en-US");
  if (billing === "per_day" && addOnId === BREAKFAST_ADD_ON_ID) {
    return `(+ THB ${formatted} / person / day)`;
  }
  if (billing === "per_day") return `(+ THB ${formatted} / day)`;
  if (billing === "per_night") return `(+ THB ${formatted} / night)`;
  if (billing === "per_leg") return `(+ THB ${formatted} / trip)`;
  return `(+ THB ${formatted})`;
}

function defaultBreakfastGuests(bookingGuests: number) {
  return Math.min(Math.max(bookingGuests, 1), 2);
}

function defaultSelections(id: string, billing: AddOnBilling, checkIn: string, checkOut: string): string[] {
  if (billing === "per_day") return getDefaultPaidAddOnDays(checkIn, checkOut);
  if (billing === "per_leg") return AIRPORT_TRANSFER_LEGS.map((leg) => leg.id);
  return [];
}

export function BookingSpecialRequestStep({
  checkIn,
  checkOut,
  bookingGuests,
  value,
  onChange,
  error,
}: BookingSpecialRequestStepProps) {
  const stayDays = getStayServiceDays(checkIn, checkOut);

  function toggleStandardRequest(id: string) {
    onChange({
      ...value,
      standardRequests: toggleValue(value.standardRequests, id),
    });
  }

  function togglePaidAddOn(id: string, billing: AddOnBilling) {
    const isEnabled = value.paidAddOns.includes(id);
    if (isEnabled) {
      const nextSelections = { ...value.paidAddOnSelections };
      const nextGuests = { ...value.paidAddOnGuests };
      delete nextSelections[id];
      delete nextGuests[id];
      onChange({
        ...value,
        paidAddOns: value.paidAddOns.filter((item) => item !== id),
        paidAddOnSelections: nextSelections,
        paidAddOnGuests: nextGuests,
      });
      return;
    }

    const defaults = defaultSelections(id, billing, checkIn, checkOut);
    onChange({
      ...value,
      paidAddOns: [...value.paidAddOns, id],
      paidAddOnSelections:
        defaults.length > 0
          ? { ...value.paidAddOnSelections, [id]: defaults }
          : value.paidAddOnSelections,
      paidAddOnGuests:
        id === BREAKFAST_ADD_ON_ID
          ? { ...value.paidAddOnGuests, [id]: defaultBreakfastGuests(bookingGuests) }
          : value.paidAddOnGuests,
    });
  }

  function toggleSelection(addOnId: string, selectionId: string) {
    const current = value.paidAddOnSelections[addOnId] ?? [];
    const next = current.includes(selectionId)
      ? current.filter((item) => item !== selectionId)
      : [...current, selectionId];

    onChange({
      ...value,
      paidAddOnSelections: { ...value.paidAddOnSelections, [addOnId]: next },
    });
  }

  function setBreakfastGuests(guests: number) {
    onChange({
      ...value,
      paidAddOnGuests: { ...value.paidAddOnGuests, [BREAKFAST_ADD_ON_ID]: guests },
    });
  }

  return (
    <div className="space-y-8">
      <section>
        <h2 className="[font-family:var(--font-inter)] text-xl font-semibold text-[#2A2E3F]">Standard Request</h2>
        <div className="mt-5 space-y-4">
          {STANDARD_REQUEST_OPTIONS.map((option) => {
            const checked = value.standardRequests.includes(option.id);
            return (
              <label key={option.id} className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleStandardRequest(option.id)}
                  className="h-5 w-5 shrink-0 rounded border-[#D6D9E4] accent-[#C14817]"
                />
                <span className="text-base text-[#2A2E3F]">{option.label}</span>
              </label>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="[font-family:var(--font-inter)] text-xl font-semibold text-[#2A2E3F]">Special Request</h2>
        <div className="mt-5 space-y-4">
          {PAID_ADD_ON_OPTIONS.map((option) => {
            const checked = value.paidAddOns.includes(option.id);
            const selections = value.paidAddOnSelections[option.id] ?? [];
            const breakfastGuests =
              option.id === BREAKFAST_ADD_ON_ID
                ? value.paidAddOnGuests[BREAKFAST_ADD_ON_ID] ?? defaultBreakfastGuests(bookingGuests)
                : 1;

            return (
              <div key={option.id} className="space-y-3">
                <label className="flex cursor-pointer items-center justify-between gap-4">
                  <span className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => togglePaidAddOn(option.id, option.billing)}
                      className="h-5 w-5 shrink-0 rounded border-[#D6D9E4] accent-[#C14817]"
                    />
                    <span className="text-base text-[#2A2E3F]">{option.label}</span>
                  </span>
                  <span className="shrink-0 text-base text-[#646D89]">
                    {formatAddOnPrice(option.price, option.billing, option.id)}
                  </span>
                </label>

                {checked && option.id === BREAKFAST_ADD_ON_ID && (
                  <div className="ml-8 space-y-4 rounded-md border border-[#E4E6ED] bg-[#F7F7FB] px-4 py-4">
                    <div>
                      <p className="text-sm font-medium text-[#2A2E3F]">Number of guests</p>
                      <div className="mt-3 flex gap-2">
                        {BREAKFAST_GUEST_OPTIONS.map((count) => {
                          const selected = breakfastGuests === count;
                          return (
                            <button
                              key={count}
                              type="button"
                              onClick={() => setBreakfastGuests(count)}
                              className={`rounded-md border px-4 py-2 text-sm transition-colors ${
                                selected
                                  ? "border-[#C14817] bg-[#C14817] text-white"
                                  : "border-[#D6D9E4] bg-white text-[#646D89] hover:border-[#C14817]/50"
                              }`}
                            >
                              {count} {count === 1 ? "person" : "persons"}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-[#2A2E3F]">Select day(s)</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {stayDays.map((day) => {
                          const daySelected = selections.includes(day.iso);
                          return (
                            <button
                              key={day.iso}
                              type="button"
                              onClick={() => toggleSelection(option.id, day.iso)}
                              className={`rounded-md border px-3 py-2 text-sm transition-colors ${
                                daySelected
                                  ? "border-[#C14817] bg-[#C14817] text-white"
                                  : "border-[#D6D9E4] bg-white text-[#646D89] hover:border-[#C14817]/50"
                              }`}
                            >
                              {day.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {selections.length > 0 && (
                      <p className="text-sm text-[#646D89]">
                        {selections.length} day{selections.length === 1 ? "" : "s"} × {breakfastGuests}{" "}
                        {breakfastGuests === 1 ? "person" : "persons"} × THB{" "}
                        {option.price.toLocaleString("en-US")} = THB{" "}
                        {(selections.length * breakfastGuests * option.price).toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </p>
                    )}
                  </div>
                )}

                {checked && option.billing === "per_leg" && (
                  <div className="ml-8 space-y-3 rounded-md border border-[#E4E6ED] bg-[#F7F7FB] px-4 py-4">
                    <p className="text-sm font-medium text-[#2A2E3F]">Select trip(s)</p>
                    {AIRPORT_TRANSFER_LEGS.map((leg) => {
                      const legSelected = selections.includes(leg.id);
                      return (
                        <label key={leg.id} className="flex cursor-pointer items-center gap-3">
                          <input
                            type="checkbox"
                            checked={legSelected}
                            onChange={() => toggleSelection(option.id, leg.id)}
                            className="h-4 w-4 accent-[#C14817]"
                          />
                          <span className="text-sm text-[#2A2E3F]">{leg.label}</span>
                          <span className="text-sm text-[#646D89]">+ THB {option.price.toLocaleString("en-US")}</span>
                        </label>
                      );
                    })}
                    {selections.length > 0 && (
                      <p className="text-sm text-[#646D89]">
                        Total: THB{" "}
                        {(selections.length * option.price).toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <label htmlFor="additionalRequest" className="[font-family:var(--font-inter)] text-xl font-semibold text-[#2A2E3F]">
          Additional Request
        </label>
        <textarea
          id="additionalRequest"
          value={value.additionalRequest}
          onChange={(event) => onChange({ ...value, additionalRequest: event.target.value })}
          placeholder="Tell us anything else we should know for your stay"
          rows={5}
          className="mt-4 w-full rounded-md border border-[#D6D9E4] px-4 py-3 text-base text-[#2A2E3F] placeholder:text-[#9AA1B9] focus:border-[#C14817] focus:outline-none focus:ring-1 focus:ring-[#C14817]"
        />
      </section>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
