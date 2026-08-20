import type { BookingStep } from "@/features/booking-flow/types";

const STEPS: { step: BookingStep; label: string }[] = [
  { step: 1, label: "Basic Information" },
  { step: 2, label: "Special Request" },
  { step: 3, label: "Payment Method" },
];

type BookingStepperProps = {
  currentStep: BookingStep;
};

export function BookingStepper({ currentStep }: BookingStepperProps) {
  return (
    <ol className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      {STEPS.map(({ step, label }) => {
        const isActive = step === currentStep;
        const isComplete = step < currentStep;

        return (
          <li key={step} className="flex items-center gap-3">
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-base font-semibold ${
                isActive
                  ? "bg-[#C14817] text-white"
                  : isComplete
                    ? "bg-[#F4D2C4] text-[#C14817]"
                    : "bg-[#E4E6ED] text-[#646D89]"
              }`}
            >
              {step}
            </span>
            <span
              className={`text-base font-medium ${
                isActive ? "text-[#C14817]" : isComplete ? "text-[#C14817]" : "text-[#9AA1B9]"
              }`}
            >
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
